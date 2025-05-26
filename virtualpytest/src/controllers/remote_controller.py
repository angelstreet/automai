from abc import ABC, abstractmethod
from typing import Dict

class RemoteController(ABC):
    @abstractmethod
    def perform_action(self, action: str, params: Dict) -> None:
        pass

    @abstractmethod
    def get_state(self) -> str:
        pass

class DummyRemoteController(RemoteController):
    def perform_action(self, action: str, params: Dict) -> None:
        print(f"Placeholder: Performing action {action} with params {params}")

    def get_state(self) -> str:
        print("Placeholder: Getting state (returning 'home')")
        return "home"

# Placeholder subclasses for specific devices
class AndroidPhone(DummyRemoteController):
    pass

class AndroidTV(DummyRemoteController):
    pass

class ApplePhone(DummyRemoteController):
    pass

class AppleTV(DummyRemoteController):
    pass

class STB_EOS(DummyRemoteController):
    pass

class STB_Apollo(DummyRemoteController):
    pass