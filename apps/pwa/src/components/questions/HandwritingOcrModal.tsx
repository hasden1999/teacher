import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';
import { MathRenderer } from './MathRenderer.js';

export interface HandwritingOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestions: (extractedText: string) => void;
  subjectName?: string;
}

interface CropBox {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 5..100
  height: number; // percentage 5..100
}

export const HandwritingOcrModal: React.FC<HandwritingOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyQuestions,
  subjectName = 'العلوم',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [_fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedResult, setExtractedResult] = useState<string>('');
  const [hasConsent, setHasConsent] = useState<boolean>(true);
  const [previewMathMode, setPreviewMathMode] = useState<boolean>(true);

  // Fallback Bounding-Box Crop & Thresholding / SVG Redraw state (Req 6.3)
  const [activeToolMode, setActiveToolMode] = useState<'ocr' | 'crop_fallback'>('ocr');
  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 20, width: 80, height: 22 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [contrastThreshold, setContrastThreshold] = useState<number>(165);
  const [useThresholdClean, setUseThresholdClean] = useState<boolean>(true);
  const [useSvgWrapper, setUseSvgWrapper] = useState<boolean>(true);
  const [croppedPreviewUri, setCroppedPreviewUri] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isProcessing]);

  // Generate clean high-contrast cropped equation or SVG whenever cropBox or threshold changes
  useEffect(() => {
    if (!selectedImage || activeToolMode !== 'crop_fallback') return;
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const sx = Math.max(0, Math.round((cropBox.x / 100) * img.width));
      const sy = Math.max(0, Math.round((cropBox.y / 100) * img.height));
      const sw = Math.max(16, Math.min(img.width - sx, Math.round((cropBox.width / 100) * img.width)));
      const sh = Math.max(16, Math.min(img.height - sy, Math.round((cropBox.height / 100) * img.height)));

      const canvas = document.createElement('canvas');
      const maxOutWidth = 900;
      const scale = sw > maxOutWidth ? maxOutWidth / sw : 1;
      canvas.width = Math.max(16, Math.round(sw * scale));
      canvas.height = Math.max(16, Math.round(sh * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      if (useThresholdClean) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Perceived luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < contrastThreshold) {
            // Crisp dark ink for A4 print
            const darkness = Math.max(0, Math.floor((lum / contrastThreshold) * 35));
            data[i] = darkness;
            data[i + 1] = darkness;
            data[i + 2] = darkness + 10;
            data[i + 3] = 255;
          } else {
            // Pure white background removing shadows/paper lines
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const pngDataUrl = canvas.toDataURL('image/png');

      if (useSvgWrapper) {
        // Wrap cleaned equation bitmap in crisp scalable SVG container for A4 print fidelity
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}"><image href="${pngDataUrl}" width="${canvas.width}" height="${canvas.height}" style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" /></svg>`;
        const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
        setCroppedPreviewUri(`data:image/svg+xml;base64,${svgBase64}`);
      } else {
        setCroppedPreviewUri(pngDataUrl);
      }
    };
    img.src = selectedImage;

    return () => {
      cancelled = true;
    };
  }, [selectedImage, activeToolMode, cropBox, contrastThreshold, useThresholdClean, useSvgWrapper]);

  if (!isOpen) return null;

  // Optimize large images captured from mobile cameras (scale to <= 2048px, high quality JPEG)
  const optimizeImageForOcr = (dataUrl: string): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedUrl = canvas.toDataURL('image/jpeg', 0.95);
          const base64 = optimizedUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg' });
          return;
        }
        const rawBase64 = dataUrl.split(',')[1];
        const rawMime = (dataUrl.split(';')[0].split(':')[1] || 'image/jpeg').split(';')[0].trim();
        resolve({ base64: rawBase64, mimeType: rawMime });
      };
      img.onerror = () => {
        const rawBase64 = dataUrl.split(',')[1];
        const rawMime = (dataUrl.split(';')[0].split(':')[1] || 'image/jpeg').split(';')[0].trim();
        resolve({ base64: rawBase64, mimeType: rawMime });
      };
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ message: 'يرجى اختيار ملف صورة صالح', type: 'error' });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setExtractedResult('');
    };
    reader.readAsDataURL(file);
  };

  // Interactive pointer drag on image to select bounding box around handwritten equation/diagram
  const getRelativePointerCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleMouseDownCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeToolMode !== 'crop_fallback' || !selectedImage) return;
    const coords = getRelativePointerCoords(e);
    setIsDraggingCrop(true);
    setDragStartPos(coords);
    setCropBox({ x: coords.x, y: coords.y, width: 5, height: 5 });
  };

  const handleMouseMoveCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStartPos || activeToolMode !== 'crop_fallback') return;
    const coords = getRelativePointerCoords(e);
    const x = Math.min(dragStartPos.x, coords.x);
    const y = Math.min(dragStartPos.y, coords.y);
    const width = Math.max(8, Math.abs(coords.x - dragStartPos.x));
    const height = Math.max(8, Math.abs(coords.y - dragStartPos.y));
    setCropBox({
      x: Math.min(92, x),
      y: Math.min(92, y),
      width: Math.min(100 - x, width),
      height: Math.min(100 - y, height),
    });
  };

  const handleMouseUpCrop = () => {
    setIsDraggingCrop(false);
  };

  const handleInsertCroppedEquation = () => {
    if (!croppedPreviewUri) {
      showToast({ message: 'يرجى تحديد منطقة المعادلة أو الرسم أولاً', type: 'warning' });
      return;
    }
    const token = `[صورة_معادلة:${croppedPreviewUri}]`;
    setExtractedResult((prev) =>
      prev.trim()
        ? `${prev.trim()}\nس: أجب عما يأتي: ${token} (10 درجات)`
        : `س1: أجب عما يأتي: (20 درجة)\nفرع أ: جد ناتج المعادلة الآتية: ${token} (10 درجات)`
    );
    showToast({
      message: 'تم قص المعادلة وتحسين تباينها وإدراجها في النص المستخرج بدقة 100%!',
      type: 'success',
    });
  };

  const handleProcessOcr = async () => {
    if (!selectedImage) {
      showToast({ message: 'يرجى التقاط أو رفع صورة ورقة الأسئلة أولاً', type: 'error' });
      return;
    }

    if (!hasConsent) {
      showToast({ message: 'يرجى تأكيد الموافقة على معالجة الصورة بالذكاء الاصطناعي أولاً', type: 'error' });
      return;
    }

    setIsProcessing(true);

    try {
      const activeKey = getActiveGeminiApiKey();
      if (!activeKey) {
        showToast({
          message: 'مفتاح الذكاء الاصطناعي المركزي غير مضبوط في لوحة الإدارة',
          type: 'error',
        });
        setIsProcessing(false);
        return;
      }

      const { base64: base64Data, mimeType } = await optimizeImageForOcr(selectedImage);

      const promptText = `أنت ماسح ضوئي بصري حرفي فائق الدقة (Strict Verbatim OCR & Mathematical Formula Engine) متخصص في نقل ما هو مكتوب بخط اليد من أوراق الامتحانات المدرسية العراقية لمادة (${subjectName}).
مهمتك الوحيدة: قراءة ونقل النصوص والأسئلة والمعادلات الرياضية والجذور والكسور والمعادلات الكيميائية المكتوبة فعلياً في الصورة حرفياً بنسبة 100% كما هي تماماً، دون أي تدخل أو إكمال أو تخمين أو تأليف ("ولا تخترع أي شيء").

تعليمات وقواعد صارمة لاستخراج الجذور والمعادلات الرياضية بدقة 100% (Strict Math & Root LaTeX Rules):
1. انتبه بأقصى درجات الدقة لرمز الجذر المرسوم بخط اليد (√):
   - الجذر التربيعي يكتب حصراً بصيغة LaTeX داخل علامتي دولار هكذا: $\\sqrt{x}$ أو $\\sqrt{x^2 + 1}$ أو $\\sqrt{25}$.
   - الجذر التكعيبي أو النوني يكتب هكذا: $\\sqrt[3]{x}$ أو $\\sqrt[n]{x}$.
   - الجذر الذي بداخله كسر يكتب بدقة: $\\sqrt{\\frac{a}{b}}$.
   - إياك أن تتجاهل خط سقف الجذر؛ ضع كل ما يقع تحت سقف الجذر داخل الأقواس المعقوفة {...}.
2. الكسور والأسس والعمليات الجبرية:
   - الكسور تكتب بصيغة $\\frac{البسط}{المقام}$ مثل $\\frac{x+1}{x-2}$.
   - الأسس والجذور والمعادلات تحاط دائماً بـ $...$ مثل $x^2 - 5x + 6 = 0$ أو $\\int_{a}^{b} f(x) dx$ أو $\\lim_{x \\to 0}$.
3. المعادلات الكيميائية: انقلها بصيغة \\ce{...} مع الأسهم وحالات المادة بدقة مثل \\ce{CaCO3 -> CaO + CO2}.
4. انقل فقط وحصراً ما تراه عينك مرسوماً في الورقة. ممنوع منعاً باتاً إكمال أي جملة ناقصة أو تخمين بقية السؤال أو كتابة أسئلة أو إجابات من مخيلتك.
5. إذا كانت هناك معادلة مرسومة بخط يد متشابك جداً أو رسم هندسي معقد يصعب تحويله نصياً، اكتب النص المقروء وأرفق ملاحظة [معادلة/رسم يدوي - يمكن قصه بأداة القص الحرفي].
6. التزم بترقيم وترتيب الأسطر والأسئلة والفروع (س1، س2، فرع أ، فرع ب) كما هي مرسومة في الورقة.
7. أعد فقط النص المنقول حرفياً بدون أي مقدمات أو خاتمة.`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest'];
      let candidateText = '';
      let lastErrorStatus = 0;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptText },
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.0,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (candidateText) break;
          } else {
            lastErrorStatus = response.status;
          }
        } catch {
          // try next model
        }
      }

      if (candidateText) {
        setExtractedResult(candidateText);
        showToast({
          message: 'تم استخراج نصوص ومعادلات ورقة الأسئلة (بما فيها الجذور والكسور) بنجاح!',
          type: 'success',
        });
      } else {
        showToast({
          message: lastErrorStatus
            ? `تعذر استخراج النص (رمز: ${lastErrorStatus}). يمكنك استخدام أداة القص الحرفي للمعادلة.`
            : 'لم يتم التعرف على نصوص واضحة، يمكنك استخدام أداة القص الحرفي للمعادلات المرسومة.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      showToast({
        message: `تعذر إتمام المعالجة: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!extractedResult.trim()) {
      showToast({ message: 'لا يوجد نص أو معادلة مستخرجة لإدراجها', type: 'error' });
      return;
    }
    onApplyQuestions(extractedResult.trim());
    showToast({ message: 'تم إدراج الأسئلة والمعادلات المستخرجة في ورقة الامتحان بنجاح!', type: 'success' });
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Mobile Drag Indicator */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-teal-900">
          <div className="w-12 h-1.5 rounded-full bg-white/40" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 bg-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>مسح الأسئلة والجذور والمعادلات من خط اليد (100% دقة)</span>
                <span className="sr-only">Gemini Vision 2.5 - استخراج الأسئلة من خط اليد</span>
              </h2>
              <p className="text-teal-200 text-xs mt-0.5">
                يدعم تحويل الجذور ($\sqrt{}$) والمعادلات إلى LaTeX أو قص المعادلة حرفياً مع تنظيف التباين و SVG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة استخراج الأسئلة"
            className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>📷</span>
              <span>رفع صورة / التقاط بالكاميرا</span>
            </button>

            {/* Mode Switcher: AI LaTeX OCR vs Literal Bounding-Box Crop/SVG */}
            {selectedImage && (
              <div className="flex bg-slate-200 dark:bg-slate-900 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActiveToolMode('ocr')}
                  className={`min-h-[38px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeToolMode === 'ocr'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ⚡ استخراج ذكي (LaTeX + نص)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolMode('crop_fallback')}
                  className={`min-h-[38px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeToolMode === 'crop_fallback'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ✂️ قص حرفي للمعادلة / الرسم (SVG)
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>أوافق على معالجة صورة الورقة بالذكاء الاصطناعي دون تخزين بيانات شخصية</span>
            </label>

            <button
              type="button"
              disabled={!selectedImage || !hasConsent || isProcessing}
              onClick={handleProcessOcr}
              className={`min-h-[44px] px-5 py-2 rounded-xl font-extrabold text-xs shadow transition flex items-center gap-2 ${
                !selectedImage || !hasConsent || isProcessing
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer'
              }`}
            >
              <span>{isProcessing ? 'جارِ التحليل والتعرف الصارم...' : 'بدء الاستخراج الذكي ⚡'}</span>
            </button>
          </div>
        </div>

        {/* Main Work Area: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5 overflow-y-auto">
          {/* Column 1: Image Preview & Interactive Bounding-Box Equation Cropper */}
          <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 min-h-[280px] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🖼️</span>
                <span>
                  {activeToolMode === 'crop_fallback'
                    ? 'اسحب بالماوس/اللمس فوق المعادلة لقصها حرفياً:'
                    : 'معاينة صورة خط اليد:'}
                </span>
              </h3>
              {selectedImage && activeToolMode === 'ocr' && (
                <button
                  type="button"
                  onClick={() => setActiveToolMode('crop_fallback')}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  ✂️ معادلة معقدة؟ قصها كصورة/SVG
                </button>
              )}
            </div>

            {selectedImage ? (
              <div className="space-y-3 flex-1 flex flex-col">
                <div
                  ref={imageContainerRef}
                  onMouseDown={handleMouseDownCrop}
                  onMouseMove={handleMouseMoveCrop}
                  onMouseUp={handleMouseUpCrop}
                  onMouseLeave={handleMouseUpCrop}
                  className={`relative flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 select-none ${
                    activeToolMode === 'crop_fallback' ? 'cursor-crosshair' : ''
                  }`}
                >
                  <img
                    src={selectedImage}
                    alt="ورقة الأسئلة المكتوبة بخط اليد"
                    draggable={false}
                    className="max-h-[300px] w-full object-contain rounded-lg"
                  />

                  {/* Bounding Box Overlay when in Crop Fallback Mode */}
                  {activeToolMode === 'crop_fallback' && (
                    <div
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.width}%`,
                        height: `${cropBox.height}%`,
                      }}
                      className="absolute border-2 border-amber-500 bg-amber-500/15 pointer-events-none rounded shadow-sm flex items-start justify-end p-1"
                    >
                      <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        منطقة المعادلة
                      </span>
                    </div>
                  )}
                </div>

                {/* Fallback Bounding-Box Crop & Thresholding Controls */}
                {activeToolMode === 'crop_fallback' && (
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        🛠️ آلية الاحتياط الحرفي (مطابقة خط الأستاذ 100%):
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={useThresholdClean}
                            onChange={(e) => setUseThresholdClean(e.target.checked)}
                            className="rounded text-amber-600"
                          />
                          <span>تنظيف التباين (إزالة ظل الورقة)</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={useSvgWrapper}
                            onChange={(e) => setUseSvgWrapper(e.target.checked)}
                            className="rounded text-amber-600"
                          />
                          <span>تغليف SVG للطباعة</span>
                        </label>
                      </div>
                    </div>

                    {useThresholdClean && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          شدة سواد الحبر:
                        </span>
                        <input
                          type="range"
                          min={90}
                          max={220}
                          value={contrastThreshold}
                          onChange={(e) => setContrastThreshold(Number(e.target.value))}
                          className="flex-1 accent-amber-600"
                        />
                      </div>
                    )}

                    {/* Live Cropped & Cleaned Equation Preview */}
                    {croppedPreviewUri && (
                      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-amber-300">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">المعاينة:</span>
                          <img
                            src={croppedPreviewUri}
                            alt="معاينة المعادلة المقصوصة"
                            className="max-h-14 object-contain rounded"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleInsertCroppedEquation}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition active:scale-95"
                        >
                          + إدراج المعادلة في السؤال
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
              >
                <span className="text-4xl mb-2">📸</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  اضغط هنا لاختيار أو التقاط صورة ورقة الامتحان
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  يدعم خط اليد العراقي، الجذور ($\sqrt{}$)، الكسور، والمعادلات الرياضية والكيميائية
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Extracted Text Editor + Live KaTeX Math Rendering Preview */}
          <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 min-h-[280px] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>📝</span>
                <span>النص والمعادلات المستخرجة (قابل للتعديل):</span>
              </h3>
              <div className="flex items-center gap-2">
                {/* Quick Math Root / Fraction Helpers */}
                <button
                  type="button"
                  onClick={() => setExtractedResult((prev) => `${prev} $\\sqrt{x}$ `)}
                  className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[11px] font-bold hover:bg-teal-200 cursor-pointer"
                  title="إدراج جذر تربيعي"
                >
                  {'+ √x'}
                </button>
                <button
                  type="button"
                  onClick={() => setExtractedResult((prev) => `${prev} $\\sqrt[3]{x}$ `)}
                  className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[11px] font-bold hover:bg-teal-200 cursor-pointer"
                  title="إدراج جذر تكعيبي"
                >
                  {'+ ∛x'}
                </button>
                <button
                  type="button"
                  onClick={() => setExtractedResult((prev) => `${prev} $\\frac{a}{b}$ `)}
                  className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[11px] font-bold hover:bg-teal-200 cursor-pointer"
                  title="إدراج كسر"
                >
                  + كسر
                </button>
                {extractedResult && (
                  <button
                    type="button"
                    onClick={() => setExtractedResult('')}
                    className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={extractedResult}
              onChange={(e) => setExtractedResult(e.target.value)}
              placeholder="سيظهر هنا النص والمعادلات المستخرجة بصيغة LaTeX (مثل $\sqrt{x^2+1}$)... يمكنك مراجعتها أو إدراج معادلة مقصوصة."
              rows={7}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-slate-800 dark:text-slate-200"
            />

            {/* Live KaTeX & Cropped Equation Render Preview */}
            <div className="flex-1 flex flex-col border border-teal-200 dark:border-teal-900/60 rounded-xl bg-white dark:bg-slate-950 p-3 overflow-y-auto max-h-[180px]">
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300">
                  👁️ المعاينة الحية للجذور والمعادلات (KaTeX + الصور المقصوصة):
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewMathMode((p) => !p)}
                  className="text-[10px] text-slate-500 hover:text-teal-700"
                >
                  {previewMathMode ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
                </button>
              </div>
              {previewMathMode && (
                <div className="text-xs sm:text-sm">
                  {extractedResult.trim() ? (
                    <MathRenderer text={extractedResult} fontFamily="amiri" />
                  ) : (
                    <p className="text-slate-400 text-xs">
                      {'ستظهر هنا معاينة المعادلات الرياضية والجذور (√x) والصور المقصوصة كما ستبدو في ورقة الامتحان...'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={!extractedResult.trim()}
            onClick={handleApply}
            className={`min-h-[44px] px-6 py-2 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 ${
              !extractedResult.trim()
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95 cursor-pointer'
            }`}
          >
            <span>إدراج الأسئلة في ورقة الامتحان</span>
            <span>✓</span>
          </button>
        </div>
      </div>
    </div>
  );
};
