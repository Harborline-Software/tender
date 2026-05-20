import { DetailStub } from './DetailStub';
interface Props { onBack: () => void }
export function ReleaseNotesDetail({ onBack }: Props) { return <DetailStub title="Release Notes" onBack={onBack} />; }
