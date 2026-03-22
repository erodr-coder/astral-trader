import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats large numbers into compact form.
 * 1500 → 1.5K, 2300000 → 2.3M, etc.
 *
 * Usage: {{ 1500000 | formatNumber }}  → "1.5M"
 */
@Pipe({
  name: 'formatNumber',
  standalone: true,
})
export class FormatNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';

    if (Math.abs(value) >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1) + 'B';
    }
    if (Math.abs(value) >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1_000) {
      return (value / 1_000).toFixed(1) + 'K';
    }
    return value.toFixed(2);
  }
}
