import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Sparkles, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { ImageMetadata } from '../types/privagent';
import { SYNTHETIC_PRESETS } from '../utils/syntheticTestImages';

interface ImageUploadAreaProps {
  imageMetadata: ImageMetadata | null;
  onImageLoaded: (image: HTMLImageElement, metadata: ImageMetadata) => void;
  onClearImage: () => void;
  isProcessing: boolean;
}

const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  imageMetadata,
  onImageLoaded,
  onClearImage,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    setErrorMessage(null);
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate type
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage(`Unsupported format (${file.type || 'unknown'}). Please upload PNG, JPG, JPEG, or WEBP.`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          aspectRatio: (img.naturalWidth || 1) / (img.naturalHeight || 1),
          dataUrl
        });
      };
      img.onerror = () => {
        setErrorMessage('Failed to decode image. The file might be corrupted or malformed.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setErrorMessage('Error reading the selected file from disk.');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const loadSyntheticPreset = (presetId: string) => {
    setErrorMessage(null);
    const preset = SYNTHETIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const canvas = preset.generate();
    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      onImageLoaded(img, {
        fileName: `synthetic-${preset.id}.png`,
        fileSize: Math.round((dataUrl.length * 3) / 4),
        fileType: 'image/png',
        width: canvas.width,
        height: canvas.height,
        aspectRatio: canvas.width / canvas.height,
        dataUrl
      });
    };
    img.src = dataUrl;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100">Screenshot Input</h2>
        </div>

        {imageMetadata && (
          <button
            id="clear-image-btn"
            onClick={onClearImage}
            disabled={isProcessing}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Image</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <span className="font-semibold">Upload Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {!imageMetadata ? (
        <div>
          {/* Drag and Drop Zone */}
          <div
            id="upload-dropzone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-700 hover:border-indigo-500/70 bg-slate-800/40 hover:bg-slate-800/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 mb-3 border border-slate-700">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Drop browser screenshot here or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PNG, JPG, JPEG, WEBP • Max 15MB • Zero cloud upload
            </p>
          </div>

          {/* Quick Synthetic Demo Presets */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                No file ready? Try Synthetic Test Presets:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYNTHETIC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  id={`load-preset-${preset.id}`}
                  onClick={() => loadSyntheticPreset(preset.id)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-left transition group"
                >
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                  <div>
                    <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Loaded Image Specs Card */
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 rounded bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
              {imageMetadata.dataUrl ? (
                <img
                  src={imageMetadata.dataUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-100 truncate text-sm">
                {imageMetadata.fileName}
              </div>
              <div className="text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                <span className="font-mono text-cyan-300">
                  {imageMetadata.width} × {imageMetadata.height} px
                </span>
                <span>•</span>
                <span>{(imageMetadata.fileSize / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span className="uppercase text-slate-400 font-mono">
                  {imageMetadata.fileType.replace('image/', '')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-800/40">
              <CheckCircle className="w-3.5 h-3.5" /> Ready for OCR
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
