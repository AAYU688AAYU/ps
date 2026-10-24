import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles 
} from 'lucide-react';

export default function ImageUploadModal({
  isOpen,
  onClose,
  sessionId,
  onUploadSuccess
}) {
  const [eye, setEye] = useState('OD');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a retinal fundus image.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('eye', eye);

    try {
      const res = await fetch(`/api/screenings/${sessionId}/upload_image/`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload retinal image.');
      }

      const data = await res.json();
      onUploadSuccess(data);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-[#005eb8]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Upload Retinal Fundus Capture
              </h3>
              <p className="text-xs text-slate-500">
                Automatic Image Quality Assessment & ICDR Pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="p-6 space-y-5 text-xs">
          
          {/* Eye Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-2">Select Eye Examination:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEye('OD')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  eye === 'OD'
                    ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                OD - Right Eye (Oculus Dexter)
              </button>
              <button
                type="button"
                onClick={() => setEye('OS')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  eye === 'OS'
                    ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                OS - Left Eye (Oculus Sinister)
              </button>
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div>
            <label className="block text-slate-700 font-bold mb-2">Fundus Image File (JPG / PNG):</label>
            <label className="border-2 border-dashed border-slate-300 hover:border-[#005eb8] bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors block text-center">
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-full mx-auto ring-4 ring-blue-200 shadow-md"
                  />
                  <p className="text-[#005eb8] font-bold text-xs">{selectedFile?.name}</p>
                  <span className="text-[10px] text-slate-500 block">Click to change image</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-[#005eb8] mx-auto" />
                  <p className="text-slate-800 font-bold">Click to browse or drag & drop fundus photo</p>
                  <p className="text-[11px] text-slate-500">Supports portable non-mydriatic cameras (Forus, Remidio, Topcon)</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2.5 rounded-xl bg-[#005eb8] hover:bg-[#00478f] text-white font-bold transition-all shadow-md shadow-blue-900/10 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing IQA & AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Clinical AI Pipeline</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
