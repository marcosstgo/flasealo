import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from './ui/Button'

interface Photo {
  id: string
  image_path: string
  created_at: string
  format: string
  size: number
  uploader_name?: string | null
}

interface PhotoViewerProps {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onDownload?: (imageUrl: string, photoId: string) => void
  allowDownloads?: boolean
  getImageUrl: (imagePath: string) => string
}

export function PhotoViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onDownload,
  allowDownloads = true,
  getImageUrl
}: PhotoViewerProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(currentIndex)
  const [isLoading, setIsLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  useEffect(() => {
    setCurrentPhotoIndex(currentIndex)
  }, [currentIndex])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const goToPrevious = useCallback(() => {
    setCurrentPhotoIndex((prev) => 
      prev > 0 ? prev - 1 : photos.length - 1
    )
    setIsLoading(true)
  }, [photos.length])

  const goToNext = useCallback(() => {
    setCurrentPhotoIndex((prev) => 
      prev < photos.length - 1 ? prev + 1 : 0
    )
    setIsLoading(true)
  }, [photos.length])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return

    switch (event.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        goToPrevious()
        break
      case 'ArrowRight':
        goToNext()
        break
    }
  }, [isOpen, onClose, goToPrevious, goToNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  const handleDownload = () => {
    if (onDownload && photos[currentPhotoIndex]) {
      const currentPhoto = photos[currentPhotoIndex]
      onDownload(getImageUrl(currentPhoto.image_path), currentPhoto.id)
    }
  }

  if (!isOpen || !photos.length) return null

  const currentPhoto = photos[currentPhotoIndex]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      {/* Header with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {currentPhotoIndex + 1} de {photos.length}
            </span>
            {allowDownloads && onDownload && (
              <Button
                onClick={handleDownload}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            )}
          </div>
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
            size="sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
            size="sm"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Main image */}
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center p-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
          </div>
        )}
        <img
          src={getImageUrl(currentPhoto.image_path)}
          alt={`Foto ${currentPhotoIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      {/* Bottom info */}
      {currentPhoto.uploader_name && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-center text-white/70 text-sm">
            Foto de <span className="text-white font-medium">{currentPhoto.uploader_name}</span>
          </p>
        </div>
      )}

      {/* Dots indicator for mobile */}
      {photos.length > 1 && photos.length <= 20 && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentPhotoIndex(index)
                setIsLoading(true)
              }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentPhotoIndex 
                  ? 'bg-white' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}