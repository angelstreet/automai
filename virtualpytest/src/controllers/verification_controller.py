from abc import ABC, abstractmethod
from typing import Optional
from .av_controller import AudioVideoController

class VerificationController(ABC):
    def __init__(self, av_controller: AudioVideoController):
        self.av_controller = av_controller

    @abstractmethod
    def wait_for_image_appear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_image_disappear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_audio_appear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_audio_disappear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_video_appear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_video_disappear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_text_appear(self, condition: str, timeout: float) -> bool:
        pass

    @abstractmethod
    def wait_for_text_disappear(self, condition: str, timeout: float) -> bool:
        pass

class DummyVerificationController(VerificationController):
    def wait_for_image_appear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for image {condition} to appear (timeout: {timeout}s)")
        return True

    def wait_for_image_disappear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for image {condition} to disappear (timeout: {timeout}s)")
        return True

    def wait_for_audio_appear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for audio {condition} to appear (timeout: {timeout}s)")
        return True

    def wait_for_audio_disappear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for audio {condition} to disappear (timeout: {timeout}s)")
        return True

    def wait_for_video_appear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for video {condition} to appear (timeout: {timeout}s)")
        return True

    def wait_for_video_disappear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for video {condition} to disappear (timeout: {timeout}s)")
        return True

    def wait_for_text_appear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for text {condition} to appear (timeout: {timeout}s)")
        return True

    def wait_for_text_disappear(self, condition: str, timeout: float) -> bool:
        print(f"Placeholder: Waiting for text {condition} to disappear (timeout: {timeout}s)")
        return True