// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceGradeEntryModal } from '../src/components/gradebook/VoiceGradeEntryModal.js';
import { CANONICAL_GRADE_COLUMNS } from '../src/components/gradebook/types.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('VoiceGradeEntryModal Unit Test Suite (Section 8.3 & A9)', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockStudents = [
    { id: 's1', fullName: 'أحمد علي حسن', rollNumber: 1 },
    { id: 's2', fullName: 'كرار حسين مهدي', rollNumber: 2 },
    { id: 's3', fullName: 'زينب محمد جعفر', rollNumber: 3 },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders modal with Mode A1 by default and displays column selector', () => {
    act(() => {
      root.render(
        <VoiceGradeEntryModal
          isOpen={true}
          onClose={() => {}}
          students={mockStudents}
          columns={CANONICAL_GRADE_COLUMNS}
          activeColumnKey="component_oral"
          onApplyGrades={() => {}}
        />
      );
    });

    expect(container.textContent).toContain('الرصد الصوتي الذكي (A1/A9)');
    expect(container.textContent).toContain('بالنقر A1 (الافتراضي)');
    expect(container.textContent).toContain('بالاسم B');
    expect(container.textContent).toContain('الشفوي');
  });

  it('does not render when isOpen is false', () => {
    act(() => {
      root.render(
        <VoiceGradeEntryModal
          isOpen={false}
          onClose={() => {}}
          students={mockStudents}
          columns={CANONICAL_GRADE_COLUMNS}
          onApplyGrades={() => {}}
        />
      );
    });

    expect(container.textContent).toBe('');
  });

  it('switches between Mode A1 and Mode B', () => {
    act(() => {
      root.render(
        <VoiceGradeEntryModal
          isOpen={true}
          onClose={() => {}}
          students={mockStudents}
          columns={CANONICAL_GRADE_COLUMNS}
          onApplyGrades={() => {}}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const modeBButton = buttons.find((b) => b.textContent?.includes('بالاسم B'));
    expect(modeBButton).toBeDefined();

    act(() => {
      modeBButton?.click();
    });

    // Switched to Mode B
    const a1Btn = buttons.find((b) => b.textContent?.includes('بالنقر A1'));
    expect(a1Btn?.className).not.toContain('bg-white');
  });
});
