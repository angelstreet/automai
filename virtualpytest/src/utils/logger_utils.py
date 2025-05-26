import logging
from pymongo import MongoClient
from typing import Optional

class Logger:
    def __init__(self, log_file: str, mongo_client: MongoClient):
        self.mongo_client = mongo_client
        self.logger = logging.getLogger('VirtualPyTest')
        self.logger.setLevel(logging.DEBUG)
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
        self.logger.addHandler(handler)

    def debug(self, message: str, test_id: Optional[str] = None) -> None:
        """Log a debug message."""
        self.logger.debug(message)
        self.log_to_mongo('DEBUG', message, test_id)

    def info(self, message: str, test_id: Optional[str] = None) -> None:
        """Log an info message."""
        self.logger.info(message)
        self.log_to_mongo('INFO', message, test_id)

    def error(self, message: str, test_id: Optional[str] = None) -> None:
        """Log an error message."""
        self.logger.error(message)
        self.log_to_mongo('ERROR', message, test_id)

    def log_to_mongo(self, level: str, message: str, test_id: Optional[str]) -> None:
        """Save log entry to MongoDB."""
        from .db_utils import save_log
        save_log(test_id or 'system', level, message, self.mongo_client)