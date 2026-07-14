from dataclasses import dataclass
from typing import Optional


@dataclass
class GarmentSchema:

    garment_type: Optional[str]

    category: Optional[str]

    primary_color: Optional[str]

    secondary_color: Optional[str]

    fabric: Optional[str]

    pattern: Optional[str]

    sleeve: Optional[str]

    fit: Optional[str]

    style: Optional[str]

    occasion: Optional[str]

    gender: Optional[str]

    season: Optional[str]

    confidence: float = 0.90