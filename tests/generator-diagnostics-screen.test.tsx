import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { GeneratorDiagnosticsScreen } from '@/features/developer/generator-diagnostics-screen';
import type { TextShareService } from '@/services/text-share';

describe('GEN-003 generator diagnostics screen', () => {
  it('presents accessible synthetic-suite status and a readable trace', async () => {
    const onBack = jest.fn();
    const screen = await render(
      <GeneratorDiagnosticsScreen
        onBack={onBack}
        shareService={{ share: jest.fn().mockResolvedValue(undefined) }}
      />,
    );

    screen.getByRole('header', { name: 'Generator diagnostics' });
    screen.getByRole('header', { name: 'Scenario suite passed' });
    screen.getByText('153 of 153 scenarios passed');
    screen.getByText(/89 durations, 13 modes, 27 target configurations/i);
    screen.getByText(/Generator trace v1/);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Run scenarios again' }),
    );
    screen.getByText('Rerun complete: 153 of 153 scenarios passed.');
    screen.getByRole('button', { name: 'Share redacted trace' });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to settings' }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shares only the redacted JSON through the platform interface', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const shareService: TextShareService = { share };
    const screen = await render(
      <GeneratorDiagnosticsScreen
        onBack={jest.fn()}
        shareService={shareService}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Share redacted trace' }),
    );
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sharedJson: string = share.mock.calls[0]![1];
    expect(JSON.parse(sharedJson)).toMatchObject({
      schema_version: 1,
      redaction: 'default',
    });
    expect(sharedJson).not.toContain('check_in_id');
    expect(sharedJson).not.toContain('target_regions');
    screen.getByText('Trace sharing opened.');
  });
});
