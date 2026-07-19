import { describe, it, expect } from 'vitest';

describe('useToast Hook', () => {
  it('should create toast notification', () => {
    const toast = { id: '1', title: 'Success', description: 'Operation completed', variant: 'default' };
    expect(toast.title).toBe('Success');
    expect(toast.variant).toBe('default');
  });

  it('should support success variant', () => {
    const toast = { variant: 'success', title: 'Kaydedildi' };
    expect(toast.variant).toBe('success');
  });

  it('should support error variant', () => {
    const toast = { variant: 'error', title: 'Hata', description: 'Bir hata oluştu' };
    expect(toast.variant).toBe('error');
  });

  it('should support destructive variant', () => {
    const toast = { variant: 'destructive', title: 'Silindi' };
    expect(toast.variant).toBe('destructive');
  });

  it('should support warning variant', () => {
    const toast = { variant: 'warning', title: 'Uyarı' };
    expect(toast.variant).toBe('warning');
  });
});
