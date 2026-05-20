import { DetailStub } from './DetailStub';
interface Props { onBack: () => void }
export function EngineRoomDetail({ onBack }: Props) { return <DetailStub title="Engine Room" onBack={onBack} />; }
