import { DetailStub } from './DetailStub';
interface Props { onBack: () => void }
export function SunfishDetail({ onBack }: Props) { return <DetailStub title="Sunfish" onBack={onBack} />; }
