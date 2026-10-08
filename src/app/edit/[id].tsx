import { router, useLocalSearchParams } from 'expo-router';
import { StubForm } from '../../components/StubForm';
import { updateStub, useStore } from '../../lib/store';

export default function Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stub = useStore((s) => s.stubs.find((x) => x.id === id));
  if (!stub) return null;

  return (
    <StubForm
      heading={stub.kind === 'stay' ? 'Edit stay' : 'Edit ticket'}
      stub={stub}
      saveLabel="Save changes"
      onCancel={() => router.back()}
      onSave={async (fields) => {
        await updateStub(stub.id, { ...fields, title: fields.title.trim() || stub.title });
        router.back();
      }}
    />
  );
}
