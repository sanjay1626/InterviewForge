import {
  isFormValid,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRequired,
} from '../validators';

describe('validateEmail', () => {
  it('rejects empty and malformed emails', () => {
    expect(validateEmail('')).toBe('Email is required.');
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address.');
    expect(validateEmail('a@b')).toBe('Enter a valid email address.');
  });

  it('accepts a well-formed email and trims whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires at least 8 characters', () => {
    expect(validatePassword('')).toBe('Password is required.');
    expect(validatePassword('short')).toBe(
      'Password must be at least 8 characters.',
    );
    expect(validatePassword('longenough')).toBeNull();
  });
});

describe('validateConfirmPassword', () => {
  it('flags mismatches', () => {
    expect(validateConfirmPassword('abcdefgh', '')).toBe(
      'Please confirm your password.',
    );
    expect(validateConfirmPassword('abcdefgh', 'different')).toBe(
      'Passwords do not match.',
    );
    expect(validateConfirmPassword('abcdefgh', 'abcdefgh')).toBeNull();
  });
});

describe('validateRequired / isFormValid', () => {
  it('validateRequired flags blank strings', () => {
    expect(validateRequired('   ', 'Target role')).toBe('Target role is required.');
    expect(validateRequired('PM', 'Target role')).toBeNull();
  });

  it('isFormValid is true only when all errors are null', () => {
    expect(isFormValid({ a: null, b: null })).toBe(true);
    expect(isFormValid({ a: null, b: 'x' })).toBe(false);
  });
});
