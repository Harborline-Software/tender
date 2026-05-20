import { DetailStub } from './DetailStub';
interface Props { onBack: () => void }
export function SignalBridgeDetail({ onBack }: Props) { return <DetailStub title="Signal-Bridge" onBack={onBack} />; }
