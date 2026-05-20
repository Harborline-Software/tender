import { DetailStub } from './DetailStub';
interface Props { onBack: () => void }
export function FlightDeckDetail({ onBack }: Props) { return <DetailStub title="Flight-Deck" onBack={onBack} />; }
