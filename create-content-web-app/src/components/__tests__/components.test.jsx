import { describe, test, expect, beforeAll } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@shared/translation/i18n';
import StatusChip from '@components/StatusChip/StatusChip';
import ScoreChip from '@components/ScoreChip/ScoreChip';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import MuiButton from '@components/MuiButton/MuiButton';

const wrap = (ui) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe('ortak bileşenler', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  test('StatusChip durum etiketini çevirir; bilinmeyen durum ham gösterilir', () => {
    wrap(<><StatusChip status="needs_assets" /><StatusChip status="weird_status" /></>);
    expect(screen.getByText(i18n.t('status.needs_assets'))).toBeTruthy();
    expect(screen.getByText('weird_status')).toBeTruthy();
  });

  test('ScoreChip skoru ve boş değeri gösterir', () => {
    wrap(<><ScoreChip score={82} /><ScoreChip score={null} /></>);
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });

  test('ErrorAlert API hata kodunu i18n ile çözer (metin elle yazılmaz)', () => {
    wrap(<ErrorAlert error={{ response: { data: { error: { code: 'TOPIC_QUEUE_FULL', message: 'raw' } } } }} />);
    expect(screen.getByText(i18n.t('apiErrors.TOPIC_QUEUE_FULL'))).toBeTruthy();
    expect(screen.queryByText('raw')).toBeNull();
  });

  test('ErrorAlert hata yokken hiçbir şey çizmez', () => {
    const { container } = wrap(<ErrorAlert error={null} />);
    expect(container.textContent).toBe('');
  });

  test('MuiButton yükleniyorken devre dışı kalır', () => {
    wrap(<MuiButton loading>Save</MuiButton>);
    expect(screen.getByRole('button', { name: /save/i }).disabled).toBe(true);
  });
});
