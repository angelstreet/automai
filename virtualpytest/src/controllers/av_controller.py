from abc import ABC, abstractmethod
from typing import Optional

class AudioVideoController(ABC):
    @abstractmethod
    def capture_image(self) -> Optional[str]:
        pass

    @abstractmethod
    def capture_audio(self) -> Optional[str]:
        pass

    @abstractmethod
    def capture_video(self) -> Optional[str]:
        pass

    @abstractmethod
    def capture_text(self) -> Optional[str]:
        pass

class DummyAudioVideoController(AudioVideoController):
    def capture_image(self) -> Optional[str]:
        print("Placeholder: Capturing image")
        return "image_data"

    def capture_audio(self) -> Optional[str]:
        print("Placeholder: Capturing audio")
        return "audio_data"

    def capture_video(self) -> Optional[str]:
        print("Placeholder: Capturing video")
        return "video_data"

    def capture_text(self) -> Optional[str]:
        print("Placeholder: Capturing text via OCR")
        return "text_data"

# Placeholder subclasses
class HDMI_Acquisition(DummyAudioVideoController):
    pass

class ADB_Acquisition(DummyAudioVideoController):
    pass

class Camera_Acquisition(DummyAudioVideoController):
    pass