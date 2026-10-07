/**
 * @techeeer/content - Official Curriculum Chapters & Units Directory
 */

import type {
  AcademicStream,
  CurriculumChapter,
} from '../types/index.js';

export const IRAQI_CHAPTERS: CurriculumChapter[] = [
  // ==========================================
  // العلوم - الصف الخامس الابتدائي (Primary Grade 5 Science)
  // ==========================================
  {
    id: 'ch_sci_5_u1_c1',
    subjectId: 'science_primary',
    subjectNameAr: 'العلوم',
    grade: 5,
    stage: 'primary',
    stream: 'general',
    unitNumber: 1,
    unitTitle: 'أجهزة جسم الإنسان وصحتها',
    chapterNumber: 1,
    chapterTitle: 'الجهاز الدوري والجهاز التنفسي',
    topics: [
      'مكونات الجهاز الدوري ووظيفة القلب والأوعية الدموية',
      'الدورة الدموية وأهمية المحافظة على صحة القلب',
      'مكونات الجهاز التنفسي والتبادل الغازي',
      'العادات الصحية لحماية الجهاز التنفسي من الأمراض',
    ],
    learningOutcomes: [
      'يتعرف على وظائف القلب والدم والأوعية الدموية',
      'يوضح آلية حركة الدم في الدورة الدموية',
      'يعدد أجزاء الجهاز التنفسي وآلية الشهيق والزفير',
      'يطبق العادات الصحية للوقاية من أمراض الجهاز التنفسي',
    ],
    estimatedPeriods: 8,
    semester: 1,
  },
  {
    id: 'ch_sci_5_u1_c2',
    subjectId: 'science_primary',
    subjectNameAr: 'العلوم',
    grade: 5,
    stage: 'primary',
    stream: 'general',
    unitNumber: 1,
    unitTitle: 'أجهزة جسم الإنسان وصحتها',
    chapterNumber: 2,
    chapterTitle: 'الجهاز الهضمي والجهاز البولي',
    topics: [
      'أعضاء القناة الهضمية ووظيفة الغدد الملحقة',
      'عملية الهضم والامتصاص',
      'أجزاء الجهاز البولي والتخلص من الفضلات',
    ],
    learningOutcomes: [
      'يتتبع مسار الطعام خلال القناة الهضمية',
      'يوضح دور الكليتين في تنقية الدم',
      'يمارس سلوكيات غذائية سليمة',
    ],
    estimatedPeriods: 8,
    semester: 1,
  },
  {
    id: 'ch_sci_5_u2_c3',
    subjectId: 'science_primary',
    subjectNameAr: 'العلوم',
    grade: 5,
    stage: 'primary',
    stream: 'general',
    unitNumber: 2,
    unitTitle: 'تصنيف الكائنات الحية وتكاثرها',
    chapterNumber: 3,
    chapterTitle: 'التكاثر في النباتات',
    topics: ['التكاثر بالبذور وأجزاء البذرة', 'التكاثر الخضري الطبيعي والاصطناعي (الدرنات والأبصال)'],
    learningOutcomes: ['يصف مراحل إنبات البذرة', 'يقارن بين التكاثر بالبذور والتكاثر الخضري'],
    estimatedPeriods: 6,
    semester: 1,
  },
  {
    id: 'ch_sci_5_u3_c5',
    subjectId: 'science_primary',
    subjectNameAr: 'العلوم',
    grade: 5,
    stage: 'primary',
    stream: 'general',
    unitNumber: 3,
    unitTitle: 'المادة وتغيراتها',
    chapterNumber: 5,
    chapterTitle: 'العناصر الكيميائية وتصنيفها',
    topics: ['مفهوم العنصر وأهميته', 'الفلزات واللافلزات وأشباه الفلزات'],
    learningOutcomes: ['يميز بين الفلزات واللافلزات حسب الخواص الفيزيائية', 'يعطي أمثلة على عناصر شائعة في الطبيعة'],
    estimatedPeriods: 6,
    semester: 2,
  },
  {
    id: 'ch_sci_5_u4_c7',
    subjectId: 'science_primary',
    subjectNameAr: 'العلوم',
    grade: 5,
    stage: 'primary',
    stream: 'general',
    unitNumber: 4,
    unitTitle: 'القوة والحركة',
    chapterNumber: 7,
    chapterTitle: 'قوة الاحتكاك',
    topics: ['مفهوم قوة الاحتكاك', 'أنواع السطوح وتأثيرها على الحركة', 'فوائد الاحتكاك ومضاره'],
    learningOutcomes: ['يستنتج العوامل المؤثرة في قوة الاحتكاك', 'يقترح طرقاً لتقليل الاحتكاك أو زيادته'],
    estimatedPeriods: 6,
    semester: 2,
  },

  // ==========================================
  // الكيمياء - الصف الخامس العلمي (Preparatory Grade 5 Scientific Chemistry)
  // ==========================================
  {
    id: 'ch_chem_5_c1',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'البناء الذري والغازات',
    chapterNumber: 1,
    chapterTitle: 'نظرية الكم والترتيب الإلكتروني للذرة',
    topics: [
      'الأعداد الكمية الأربعة (الرئيسي، الثانوي، المغناطيسي، المغزلي)',
      'مبدأ البناء التصاعدي (أوفباو) وقاعدة هوند ومبدأ باولي',
      'كتابة الترتيب الإلكتروني للذرات والأيونات',
    ],
    learningOutcomes: [
      'يحسب قيم الأعداد الكمية للإلكترون الأخير في الذرات والأيونات',
      'يطبق قواعد الترتيب الإلكتروني بدقة',
    ],
    estimatedPeriods: 10,
    semester: 1,
  },
  {
    id: 'ch_chem_5_c2',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'البناء الذري والغازات',
    chapterNumber: 2,
    chapterTitle: 'قوى الترابط والأشكال الهندسية للجزيئات',
    topics: [
      'رمز لويس والقاعدة الثمانية',
      'الرابطة الأيونية والتساهمية والتناسقية',
      'الرابطة الهيدروجينية وقوى فان در فالس',
      'نظرية تنافر أزواج إلكترونات غلاف التكافؤ (VSEPR) ونظرية أوربتالات الجزيء',
    ],
    learningOutcomes: [
      'يرسم هياكل لويس لمختلف الجزيئات والأيونات المعقدة',
      'يتوقع الشكل الهندسي والزوايا بين الروابط استناداً لنظرية VSEPR',
    ],
    estimatedPeriods: 10,
    semester: 1,
  },
  {
    id: 'ch_chem_5_c3',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'البناء الذري والغازات',
    chapterNumber: 3,
    chapterTitle: 'الغازات وقوانينها',
    topics: [
      'الضغط ودرجة الحرارة والحجم ووحدات قياسها',
      'قانون بويل: العلاقة بين الحجم والضغط عند ثبوت الحرارة (P1 V1 = P2 V2)',
      'قانون شارل: العلاقة بين الحجم ودرجة الحرارة عند ثبوت الضغط (V1 / T1 = V2 / T2)',
      'قانون غاي-لوساك وقانون الغاز المثالي الموحد (PV = nRT)',
      'قانون دالتون للضغوط الجزئية وقانون غراهام للانتشار',
    ],
    learningOutcomes: [
      'يطبق القوانين الرياضية للغازات في حل المسائل الحسابية',
      'يميز بين الغاز المثالي والغاز الحقيقي وحيود الغازات',
    ],
    estimatedPeriods: 14,
    semester: 1,
  },
  {
    id: 'ch_chem_5_c4',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 2,
    unitTitle: 'المحاليل والتفاعلات',
    chapterNumber: 4,
    chapterTitle: 'المحاليل وقابليتها للذوبان',
    topics: [
      'أنواع المحاليل وطبيعة عملية الإذابة',
      'طرائق التعبير عن التركيز (المولارية، المولالية، الكسر المولي، النسبة الكتلية)',
      'الخواص الجمعية للمحاليل وضغط البخار ودرجة الغليان والتجمد',
    ],
    learningOutcomes: ['يحسب التراكيز المختلفة للمحاليل', 'يحل مسائل الخواص الجمعية'],
    estimatedPeriods: 12,
    semester: 2,
  },
  {
    id: 'ch_chem_5_c6',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 3,
    unitTitle: 'الاتزان والكيمياء العضوية',
    chapterNumber: 6,
    chapterTitle: 'الحوامض والقواعد والأملاح',
    topics: [
      'نظريات تعريف الحوامض والقواعد (أرهينيوس، برونشتد-لوري، لويس)',
      'التأين الذاتي للماء والرقم الهيدروجيني pH',
      'الدلائل ومعايرة الأحماض والقواعد',
    ],
    learningOutcomes: ['يحسب تركيز أيون الهيدروجين والـ pH', 'يكتب معادلات التحلل المائي للأملاح'],
    estimatedPeriods: 10,
    semester: 2,
  },

  // ==========================================
  // الفيزياء - الصف الخامس العلمي (Preparatory Grade 5 Scientific Physics)
  // ==========================================
  {
    id: 'ch_phys_5_c1',
    subjectId: 'physics_scientific',
    subjectNameAr: 'الفيزياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'الميكانيك وتحليل الحركة',
    chapterNumber: 1,
    chapterTitle: 'المتجهات',
    topics: [
      'أنظمة الإحداثيات (الكارتيزية والقطبية)',
      'الكميات القياسية والكميات الاتجاهية',
      'تحليل المتجه إلى مركبتين متعامدتين',
      'جمع المتجهات بيانياً وجبرياً',
      'الضرب النقطي (العددي) والضرب الاتجاهي للمتجهات',
    ],
    learningOutcomes: [
      'يحول بين الإحداثيات الكارتيزية والقطبية',
      'يحلل أي متجه لقواه ومركباته الأفقية والعمودية',
      'يحسب ناتج الضرب القياسي والضرب الاتجاهي',
    ],
    estimatedPeriods: 10,
    semester: 1,
  },
  {
    id: 'ch_phys_5_c2',
    subjectId: 'physics_scientific',
    subjectNameAr: 'الفيزياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'الميكانيك وتحليل الحركة',
    chapterNumber: 2,
    chapterTitle: 'الحركة الخطية',
    topics: [
      'الموقع والإزاحة والسرعة المتوسطة والآنية',
      'التعجيل الخطي ومعادلات الحركة الخطية بتعجيل منتظم',
      'السقوط الحر والمقذوفات في مجال الجاذبية الأرضية',
    ],
    learningOutcomes: ['يطبق معادلات الحركة ذات التعجيل المنتظم', 'يحل مسائل المقذوفات الأفقية والمائلة'],
    estimatedPeriods: 12,
    semester: 1,
  },
  {
    id: 'ch_phys_5_c3',
    subjectId: 'physics_scientific',
    subjectNameAr: 'الفيزياء',
    grade: 5,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'الميكانيك وتحليل الحركة',
    chapterNumber: 3,
    chapterTitle: 'قوانين الحركة لنيوتن والديناميك',
    topics: [
      'القانون الأول لنيوتن (القصور الذاتي)',
      'القانون الثاني لنيوتن (العلاقة بين القوة والكتلة والتعجيل)',
      'القانون الثالث لنيوتن (الفعل ورد الفعل)',
      'قوى الاحتكاك والوزن الحقيقي والوزن الظاهري للمصاعد',
    ],
    learningOutcomes: ['يرسم مخطط الجسم الحر', 'يحسب التسارع والوزن الظاهري في المصاعد'],
    estimatedPeriods: 12,
    semester: 1,
  },

  // ==========================================
  // الرياضيات - الصف الثالث المتوسط (Intermediate Grade 3 Math)
  // ==========================================
  {
    id: 'ch_math_3_c1',
    subjectId: 'math_intermediate',
    subjectNameAr: 'الرياضيات',
    grade: 3,
    stage: 'intermediate',
    stream: 'general',
    unitNumber: 1,
    unitTitle: 'الأعداد والعلاقات',
    chapterNumber: 1,
    chapterTitle: 'العلاقات والمتباينات في الأعداد الحقيقية',
    topics: [
      'ترتيب العمليات في الأعداد الحقيقية وتبسيط الجذور التربيعية والتكعيبية',
      'التطبيقات وأنواع التطبيق (الشامل، المتباين، التقابل) وتركيب التطبيقات',
      'المتتابعات الحسابية والحد العام',
      'المتباينات المركبة ومتباينات القيمة المطلقة ومجموعات الحل',
    ],
    learningOutcomes: [
      'يبسط المقادير العددية التي تحوي جذوراً حقيقية',
      'يحدد نوع التطبيق ويجد تركيبه',
      'يجد حدود المتتابعة الحسابية',
      'يحل متباينات القيمة المطلقة ويمثلها على خط الأعداد',
    ],
    estimatedPeriods: 16,
    semester: 1,
  },
  {
    id: 'ch_math_3_c2',
    subjectId: 'math_intermediate',
    subjectNameAr: 'الرياضيات',
    grade: 3,
    stage: 'intermediate',
    stream: 'general',
    unitNumber: 1,
    unitTitle: 'الجبر والمعادلات',
    chapterNumber: 2,
    chapterTitle: 'المقادير الجبرية وتحليلها',
    topics: [
      'ضرب المقادير الجبرية',
      'تحليل المقدار الجبري باستخراج العامل المشترك الأكبر (G.C.F)',
      'تحليل المقدار بالفرق بين مربعين وبالمربع الكامل',
      'تحليل المقدار الثلاثي بالتجربة',
      'تحليل مجموع مكعبين والفرق بين مكعبين',
      'تبسيط المقادير الجبرية النسبية',
    ],
    learningOutcomes: ['يتقن كافة طرق التحليل الجبري', 'يبسط الكسور الجبرية المعقدة'],
    estimatedPeriods: 14,
    semester: 1,
  },
  {
    id: 'ch_math_3_c3',
    subjectId: 'math_intermediate',
    subjectNameAr: 'الرياضيات',
    grade: 3,
    stage: 'intermediate',
    stream: 'general',
    unitNumber: 2,
    unitTitle: 'حل المعادلات',
    chapterNumber: 3,
    chapterTitle: 'المعادلات الخطية والتربيعية',
    topics: [
      'حل نظام من معادلتين خطيتين بمتغيرين (بيانياً، بالتعويض، بالحذف)',
      'حل المعادلة التربيعية بمتغير واحد بإكمال المربع وبالتجربة',
      'حل المعادلات بالقانون العام (الدستور) والمميز Delta',
      'حل المعادلات الكسرية والتحقق من صحة الحل',
    ],
    learningOutcomes: [
      'يحل النظام الخطي بطريقتي الحذف والتعويض بدقة متناهية',
      'يحدد طبيعة جذري المعادلة باستخدام المميز',
    ],
    estimatedPeriods: 16,
    semester: 1,
  },

  // ==========================================
  // الكيمياء - الصف السادس العلمي (Preparatory Grade 6 Scientific Chemistry)
  // ==========================================
  {
    id: 'ch_chem_6_c1',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 6,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'الثرموداينمك والاتزان',
    chapterNumber: 1,
    chapterTitle: 'علم الثرموداينمك (Thermodynamics)',
    topics: [
      'الحرارة والسعة الحرارية والحرارة النوعية',
      'إنثالبي التفاعل القياسي Delta H وأنواعه',
      'قانون هس وحساب إنثالبي التفاعل',
      'الإنتروبي Delta S وطاقة كبس الحرة Delta G والتلقائية',
    ],
    learningOutcomes: ['يطبق قانون هس في حساب طاقة التفاعل', 'يحسب طاقة كبس الحرة ويبين تلقائية التفاعل'],
    estimatedPeriods: 14,
    semester: 1,
  },
  {
    id: 'ch_chem_6_c2',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 6,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'الثرموداينمك والاتزان',
    chapterNumber: 2,
    chapterTitle: 'الاتزان الكيميائي (Chemical Equilibrium)',
    topics: [
      'التفاعلات الانعكاسية وثابت الاتزان Kc و Kp والعلاقة بينهما',
      'حسابات جدول تقدم التفاعل وتراكيز الاتزان',
      'قاعدة لوشاتلييه وتأثير العوامل الخارجية (التركيز، الضغط، الحجم، درجة الحرارة)',
    ],
    learningOutcomes: ['يحل مسائل ثابت الاتزان', 'يتوقع اتجاه التفاعل عند إحداث تغيرات خارجية وفق لوشاتلييه'],
    estimatedPeriods: 14,
    semester: 1,
  },
  {
    id: 'ch_chem_6_c3',
    subjectId: 'chemistry_scientific',
    subjectNameAr: 'الكيمياء',
    grade: 6,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 2,
    unitTitle: 'الاتزان الأيوني والكيمياء الكهربائية',
    chapterNumber: 3,
    chapterTitle: 'الاتزان الأيوني (Ionic Equilibrium)',
    topics: [
      'الإلكتروليتات القوية والضعيفة ودرجة التفكك والنسبة المئوية',
      'التأين الذاتي للماء والأس الهيدروجيني والتخفيف',
      'الأيون المشترك ومحاليل بفر (منظمات الحموضة)',
      'الذوبانية وثابت حاصل الإذابة Ksp والترسيب',
    ],
    learningOutcomes: ['يحسب التغير في pH لمحاليل بفر الثنائية والثلاثية', 'يحدد شروط الترسيب بدقة'],
    estimatedPeriods: 16,
    semester: 1,
  },

  // ==========================================
  // الفيزياء - الصف الرابع العلمي (Preparatory Grade 4 Scientific Physics)
  // ==========================================
  {
    id: 'ch_phys_4_c1',
    subjectId: 'physics_scientific',
    subjectNameAr: 'الفيزياء',
    grade: 4,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'القياس والمادة',
    chapterNumber: 1,
    chapterTitle: 'معلومات فيزيائية وأدوات القياس',
    topics: ['النظام الدولي للوحدات SI والبادئات', 'أدوات القياس الميكانيكية والخطأ التجريبي'],
    learningOutcomes: ['يتقن استخدام البادئات العلمية والتحويل بين الوحدات'],
    estimatedPeriods: 6,
    semester: 1,
  },
  {
    id: 'ch_phys_4_c2',
    subjectId: 'physics_scientific',
    subjectNameAr: 'الفيزياء',
    grade: 4,
    stage: 'preparatory',
    stream: 'scientific',
    unitNumber: 1,
    unitTitle: 'القياس والمادة',
    chapterNumber: 2,
    chapterTitle: 'الخصائص الميكانيكية للمادة والنموذج الذري',
    topics: ['مفهوم الإجهاد والمطاوعة وقانون هوك', 'معامل يونك للمرونة ومكونات النواة والنموذج الذري'],
    learningOutcomes: ['يطبق قانون هوك في حساب مرونة المواد', 'يوضح مكونات الذرة والنواة'],
    estimatedPeriods: 8,
    semester: 1,
  },
];

export function getAllChapters(): CurriculumChapter[] {
  return [...IRAQI_CHAPTERS];
}

export function getChaptersBySubject(
  subjectId: string,
  grade?: number,
  stream?: AcademicStream
): CurriculumChapter[] {
  const cleanId = subjectId.toLowerCase().trim();
  return IRAQI_CHAPTERS.filter((ch) => {
    const matchesSubject =
      ch.subjectId.toLowerCase() === cleanId ||
      ch.subjectId.toLowerCase().includes(cleanId) ||
      cleanId.includes(ch.subjectId.toLowerCase()) ||
      ch.subjectNameAr.includes(cleanId);

    if (!matchesSubject) return false;
    if (grade !== undefined && ch.grade !== grade) return false;
    if (stream && ch.stream && ch.stream !== 'general' && ch.stream !== stream) return false;
    return true;
  });
}

export function getChapterById(id: string): CurriculumChapter | undefined {
  return IRAQI_CHAPTERS.find((ch) => ch.id === id);
}
