export interface ClockCheckResult {
    valid: boolean;
    tampered: boolean;
    currentHwm: number;
    systemTime: number;
    reason?: 'CLOCK_REWIND' | 'INTRA_SESSION_JUMP';
    message?: string;
}
export type ClockSanityResult = ClockCheckResult;
export interface AntiTamperClockOptions {
    toleranceMs?: number;
    sessionDriftThresholdMs?: number;
    initialWallTime?: number;
    initialPerfTime?: number;
}
/**
 * محرك تتبع ومراقبة ساعة النظام المقاوم للتلاعب (Anti-Tamper Clock Engine)
 * يجمع بين العلامة المائية القصوى المحفوظة (HWM) والمؤقت الرتيب عالي الدقة (performance.now)
 */
export declare class AntiTamperClock {
    private highWaterMark;
    private sessionStartWall;
    private sessionStartPerf;
    private tampered;
    private tamperReason?;
    private readonly toleranceMs;
    private readonly sessionDriftThresholdMs;
    constructor(initialHwm?: number, options?: AntiTamperClockOptions);
    /**
     * فحص التوقيت الحالي والتأكد من خلوه من أي تلاعب
     */
    verifyClock(wallTime?: number, perfTime?: number): ClockCheckResult;
    /**
     * تسجيل نشاط وتحديث العلامة المائية القصوى
     */
    recordActivity(wallTime?: number): number;
    getHighWaterMark(): number;
    isTampered(): boolean;
    resetSession(wallTime?: number, perfTime?: number): void;
}
/**
 * دالة مساعدة سريعة للتحقق من سلامة الساعة مقابل علامة مائية مسجلة
 */
export declare function verifyClockSanity(wallTime?: number, hwm?: number, toleranceMs?: number): ClockSanityResult;
/**
 * دالة مساعدة لتحديث العلامة المائية للوقت بصورة تصاعدية
 */
export declare function updateHighWaterMark(currentHwm: number, newTime: number): number;
//# sourceMappingURL=clock.d.ts.map