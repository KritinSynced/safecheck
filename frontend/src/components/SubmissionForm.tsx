'use client';

import React, { useState, useRef } from 'react';
import { Type, Image as ImageIcon, Send, Loader2, UploadCloud, X, Sparkles } from 'lucide-react';
import { moderateTextContent, moderateImageContent } from '../lib/api';
import { ModerationRecord, ContentType } from '../types';

interface SubmissionFormProps {
  onModerationComplete: (result: ModerationRecord) => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ onModerationComplete }) => {
  const [activeTab, setActiveTab] = useState<ContentType>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick testing presets for educational demos
  const textPresets = [
    {
      label: 'Safe Comment',
      text: 'Thanks for sharing this tutorial! It helped me learn a lot about web development and clean code practices.',
    },
    {
      label: 'Profanity / Insult',
      text: 'Shut up you complete idiot, this is total bullshit and nobody asked for your stupid opinion!',
    },
    {
      label: 'Threat / Violence',
      text: 'I will find you and murder you and bomb your office building to ashes!',
    },
    {
      label: 'Spam Offer',
      text: 'CLICK HERE NOW TO CLAIM YOUR FREE MONEY AND GUARANTEED BITCOIN CRYPTO GIVEAWAY EARN $5000 FAST ACT NOW!!!',
    },
  ];

  const imagePresets = [
    {
      label: 'Safe City View',
      expected: 'Safe (< 30)',
      filename: 'safe_city_sample.jpg',
      path: '/test_samples/safe_city_sample.jpg',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      label: 'Flagged Crash Scene',
      expected: 'Flagged (30 - 69)',
      filename: 'flagged_crash_sample.jpg',
      path: '/test_samples/flagged_crash_sample.jpg',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      label: 'Blocked Sample',
      expected: 'Blocked (≥ 70)',
      filename: 'blocked_violence_sample.png',
      path: '/test_samples/blocked_violence_sample.png',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    },
  ];

  const handleSelectImagePreset = async (preset: typeof imagePresets[0], autoAnalyze: boolean = false) => {
    try {
      setErrorMessage(null);
      const res = await fetch(preset.path);
      const blob = await res.blob();
      const file = new File([blob], preset.filename, { type: 'image/png' });
      setSelectedImage(file);
      setImagePreviewUrl(preset.path);

      if (autoAnalyze) {
        setIsSubmitting(true);
        const result = await moderateImageContent(file);
        onModerationComplete(result);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load sample image.');
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Selected image exceeds the 5MB size limit.');
      return;
    }

    // Check format
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMessage('Unsupported format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'text') {
      if (!textContent.trim()) {
        setErrorMessage('Please enter text content to analyze.');
        return;
      }

      try {
        setIsSubmitting(true);
        const result = await moderateTextContent(textContent);
        onModerationComplete(result);
        setTextContent('');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to moderate text content.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!selectedImage) {
        setErrorMessage('Please choose an image file to analyze.');
        return;
      }

      try {
        setIsSubmitting(true);
        const result = await moderateImageContent(selectedImage);
        onModerationComplete(result);
        handleClearImage();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to moderate image content via AWS Rekognition.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header and Mode Selector */}
      <div className="border-b border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Content Submission</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit text or image content for real-time automated safety scanning.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab('text'); setErrorMessage(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Moderation</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('image'); setErrorMessage(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'image'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image (AWS Rekognition)</span>
          </button>
        </div>
      </div>

      {/* Submission Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
            {errorMessage}
          </div>
        )}

        {activeTab === 'text' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="text-input" className="block text-xs font-medium text-slate-700 mb-1">
                Enter Text Content
              </label>
              <textarea
                id="text-input"
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type or paste comments, posts, or messages to evaluate..."
                className="w-full text-sm p-3 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 text-slate-900 bg-white"
                maxLength={5000}
              />
              <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                <span>Keyword &amp; spam heuristic analysis</span>
                <span>{textContent.length} / 5000 chars</span>
              </div>
            </div>

            {/* Test Sample Quick Buttons */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>Quick Test Presets:</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {textPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setTextContent(preset.text)}
                    className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors border border-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>Quick Test Sample Images (1-Click Score):</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {imagePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectImagePreset(preset, true)}
                    disabled={isSubmitting}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-center space-x-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.path}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {preset.label}
                      </p>
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border ${preset.badgeClass}`}>
                        {preset.expected}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs font-medium text-slate-700 pt-1">
              Or Upload Your Own Image
            </label>

            {!imagePreviewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Click to select an image or drag &amp; drop
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  JPG, PNG, or WebP up to 5 MB
                </p>
                <span className="mt-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Amazon S3 &rarr; Rekognition DetectModerationLabels
                </span>
              </div>
            ) : (
              <div className="relative border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center space-x-4">
                <div className="w-20 h-20 rounded bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Selected preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedImage?.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedImage ? (selectedImage.size / 1024).toFixed(1) : 0} KB &bull; {selectedImage?.type}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    Ready to upload and analyze
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Content...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Analyze Content</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

