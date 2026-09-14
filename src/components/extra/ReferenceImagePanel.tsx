import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { ImageDropzone } from '../ui/ImageDropzone';

interface ReferenceImagePanelProps {
  onAddReferenceImage(file: File): Promise<void>;
}

function isReferenceImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/png' || type === 'image/jpeg') return true;
  if (type) return false;
  const name = file.name.toLowerCase();
  return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

export function ReferenceImagePanel({ onAddReferenceImage }: ReferenceImagePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = (nextFile: File | null | undefined) => {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!isReferenceImage(nextFile)) {
      setFile(null);
      setError(t('extra.error.referenceImageType'));
      return;
    }
    setFile(nextFile);
  };

  const addImage = async () => {
    if (!file || adding) return;
    setAdding(true);
    setError(null);
    try {
      await onAddReferenceImage(file);
      setFile(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="extra-reference-image-panel">
      <ImageDropzone
        accept="image/png,image/jpeg"
        previewUrl={previewUrl}
        previewAlt={file?.name ?? ''}
        emptyLabel={t('extra.reference.upload')}
        actionLabel={file ? t('extra.replace') : t('extra.reference.choose')}
        onSelect={acceptFile}
        disabled={adding}
      />
      {file ? <div className="extra-reference-image-name">{file.name}</div> : null}
      <div className="extra-actions">
        <button
          type="button"
          className="primary-button"
          data-testid="extra-add-reference-image-button"
          disabled={!file || adding}
          onClick={addImage}
        >
          {adding ? t('extra.reference.adding') : t('extra.addReferenceImage')}
        </button>
      </div>
      {error ? <div className="extra-message error">{error}</div> : null}
    </div>
  );
}
