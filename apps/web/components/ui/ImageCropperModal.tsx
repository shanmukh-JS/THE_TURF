'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Crop, Check } from 'lucide-react'
import getCroppedImg from '@/lib/utils/cropImage'

interface ImageCropperModalProps {
  imageSrc: string
  onCropComplete: (croppedImageFile: File) => void
  onCancel: () => void
  aspectRatio?: number
  isCircular?: boolean
}

export function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1, // Default to square
  isCircular = false,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const generateCroppedImage = async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0)
      if (croppedBlob) {
        // Convert Blob to File
        const file = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        onCropComplete(file)
      }
    } catch (e) {
      console.error('Error cropping image:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">Crop Image</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={isCircular ? 'round' : 'rect'}
            showGrid={!isCircular}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            classes={{
              containerClassName: 'bg-black',
            }}
          />
        </div>

        <div className="p-4 space-y-4 border-t border-white/10 bg-[#060d06]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 font-medium w-8">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={generateCroppedImage}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-green-500 text-black hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Apply Crop'}
              {!isProcessing && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
