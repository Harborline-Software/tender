import { useTheme } from '../../theme/useTheme';
import { DetailStub } from './DetailStub';

interface Props { onBack: () => void }

export function DockSettingsDetail({ onBack }: Props) {
  const { mode, toggle } = useTheme();

  return (
    <div>
      <DetailStub title="Dock Settings" onBack={onBack} />
      {/* Theme toggle — functional even in M1 */}
      <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#888' }}>Theme</span>
        <button onClick={toggle} style={{ fontSize: 11, cursor: 'pointer', border: '1px solid #555', borderRadius: 4, padding: '3px 10px', background: 'transparent', color: '#aaa' }}>
          {mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </div>
    </div>
  );
}
