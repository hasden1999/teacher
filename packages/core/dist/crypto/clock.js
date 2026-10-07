/**
 * محرك تتبع ومراقبة ساعة النظام المقاوم للتلاعب (Anti-Tamper Clock Engine)
 * يجمع بين العلامة المائية القصوى المحفوظة (HWM) والمؤقت الرتيب عالي الدقة (performance.now)
 */
export class AntiTamperClock {
    highWaterMark;
    sessionStartWall;
    sessionStartPerf;
    tampered = false;
    tamperReason;
    toleranceMs;
    sessionDriftThresholdMs;
    constructor(initialHwm = 0, options = {}) {
        this.toleranceMs = options.toleranceMs ?? 60_000;
        this.sessionDriftThresholdMs = options.sessionDriftThresholdMs ?? 5_000;
        this.highWaterMark = Math.max(initialHwm, 0);
        const nowWall = options.initialWallTime ?? (initialHwm > 0 && initialHwm < 1_000_000_000_000 ? initialHwm : Date.now());
        const nowPerf = options.initialPerfTime ?? (initialHwm > 0 && initialHwm < 1_000_000_000_000 ? 0 : performance.now());
        this.sessionStartWall = nowWall;
        this.sessionStartPerf = nowPerf;
        if (this.highWaterMark > 0 && nowWall < this.highWaterMark - this.toleranceMs) {
            this.tampered = true;
            this.tamperReason = 'CLOCK_REWIND';
        }
    }
    /**
     * فحص التوقيت الحالي والتأكد من خلوه من أي تلاعب
     */
    verifyClock(wallTime = Date.now(), perfTime = performance.now()) {
        // 1. فحص ترجيع الساعة للوراء (Rewind Attack)
        if (wallTime < this.highWaterMark - this.toleranceMs) {
            this.tampered = true;
            this.tamperReason = 'CLOCK_REWIND';
            return {
                valid: false,
                tampered: true,
                currentHwm: this.highWaterMark,
                systemTime: wallTime,
                reason: 'CLOCK_REWIND',
                message: 'System clock is set before the recorded high-water mark'
            };
        }
        // 2. التحقق من التفاوت اللحظي داخل الجلسة (Intra-Session Jump)
        if (this.sessionStartPerf > 0 && perfTime >= this.sessionStartPerf) {
            const deltaWall = wallTime - this.sessionStartWall;
            const deltaPerf = perfTime - this.sessionStartPerf;
            const drift = Math.abs(deltaWall - deltaPerf);
            if (drift > this.sessionDriftThresholdMs) {
                this.tampered = true;
                this.tamperReason = 'INTRA_SESSION_JUMP';
                return {
                    valid: false,
                    tampered: true,
                    currentHwm: this.highWaterMark,
                    systemTime: wallTime,
                    reason: 'INTRA_SESSION_JUMP',
                    message: `Intra-session clock manipulation detected (drift: ${drift}ms)`
                };
            }
        }
        // 3. التوقيت سليم: تحديث العلامة المائية القصوى
        if (wallTime > this.highWaterMark) {
            this.highWaterMark = wallTime;
        }
        // استعادة حالة السلامة إذا تم تصحيح الساعة
        if (this.tamperReason === 'CLOCK_REWIND' && wallTime >= this.highWaterMark - this.toleranceMs) {
            this.tampered = false;
            this.tamperReason = undefined;
        }
        return {
            valid: !this.tampered,
            tampered: this.tampered,
            currentHwm: this.highWaterMark,
            systemTime: wallTime,
            reason: this.tamperReason
        };
    }
    /**
     * تسجيل نشاط وتحديث العلامة المائية القصوى
     */
    recordActivity(wallTime = Date.now()) {
        if (wallTime > this.highWaterMark) {
            this.highWaterMark = wallTime;
        }
        return this.highWaterMark;
    }
    getHighWaterMark() {
        return this.highWaterMark;
    }
    isTampered() {
        return this.tampered;
    }
    resetSession(wallTime = Date.now(), perfTime = performance.now()) {
        this.sessionStartWall = wallTime;
        this.sessionStartPerf = perfTime;
        if (wallTime < 1_000_000_000_000) {
            this.highWaterMark = wallTime;
        }
        else if (wallTime > this.highWaterMark) {
            this.highWaterMark = wallTime;
        }
        if (wallTime >= this.highWaterMark - this.toleranceMs) {
            this.tampered = false;
            this.tamperReason = undefined;
        }
    }
}
/**
 * دالة مساعدة سريعة للتحقق من سلامة الساعة مقابل علامة مائية مسجلة
 */
export function verifyClockSanity(wallTime = Date.now(), hwm = 0, toleranceMs = 60_000) {
    const clock = new AntiTamperClock(hwm, { toleranceMs });
    return clock.verifyClock(wallTime);
}
/**
 * دالة مساعدة لتحديث العلامة المائية للوقت بصورة تصاعدية
 */
export function updateHighWaterMark(currentHwm, newTime) {
    return Math.max(currentHwm, newTime);
}
//# sourceMappingURL=clock.js.map