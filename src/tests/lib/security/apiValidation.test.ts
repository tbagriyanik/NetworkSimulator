import { describe, it, expect } from 'vitest';

describe('Room & Student API Regex validation', () => {
  const roomCodeRegex = /^[A-Z0-9]{4,10}$/;
  const idRegex = /^[a-zA-Z0-9-]{8,100}$/;

  it('should validate room code strictly', () => {
    expect(roomCodeRegex.test('ABCD')).toBe(true);
    expect(roomCodeRegex.test('ROOM123')).toBe(true);
    expect(roomCodeRegex.test('ROOM-123')).toBe(false); // No hyphens in room code
    expect(roomCodeRegex.test('ROOM_123')).toBe(false);
    expect(roomCodeRegex.test('RM')).toBe(false); // Too short
    expect(roomCodeRegex.test('VERYLONGROOMCODE')).toBe(false); // Too long
    expect(roomCodeRegex.test('ABCD/E')).toBe(false); // Directory traversal attempt
    expect(roomCodeRegex.test('ABCD..')).toBe(false);
  });

  it('should validate teacher and student ID strictly', () => {
    expect(idRegex.test('teacher-123')).toBe(true);
    expect(idRegex.test('student-uuid-456')).toBe(true);
    expect(idRegex.test('short')).toBe(false); // Too short
    expect(idRegex.test('a'.repeat(101))).toBe(false); // Too long
    expect(idRegex.test('student_123')).toBe(false); // Underscores not allowed
    expect(idRegex.test('student/123')).toBe(false); // Slashes not allowed
  });

  it('should validate certificate verification code strictly', () => {
    const certCodeRegex = /^[A-Z0-9]{4,20}$/;
    expect(certCodeRegex.test('AB3KPQ7R2N')).toBe(true); // Standard 10-char
    expect(certCodeRegex.test('ABCD')).toBe(true); // Minimum 4-char
    expect(certCodeRegex.test('A'.repeat(20))).toBe(true); // Maximum 20-char
    expect(certCodeRegex.test('A'.repeat(21))).toBe(false); // Too long
    expect(certCodeRegex.test('ABC')).toBe(false); // Too short
    expect(certCodeRegex.test('AB-3KPQ7R2')).toBe(false); // Hyphen not allowed
    expect(certCodeRegex.test('AB_3KPQ7R2')).toBe(false); // Underscore not allowed
    expect(certCodeRegex.test('AB3KPQ7R2N/')).toBe(false); // Special char not allowed
    expect(certCodeRegex.test('abc1234567')).toBe(false); // Lowercase not allowed (it should be normalized to uppercase)
  });
});
