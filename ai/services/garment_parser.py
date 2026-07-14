import re


COLORS = [
    "black", "white", "blue", "red", "green",
    "yellow", "pink", "brown", "grey", "gray",
    "orange", "purple", "beige", "cream", "navy"
]

FABRICS = [
    "cotton",
    "denim",
    "linen",
    "silk",
    "wool",
    "polyester",
    "leather",
    "knit"
]

PATTERNS = [
    "plain",
    "striped",
    "checked",
    "printed",
    "graphic",
    "floral",
    "solid"
]

GARMENTS = [
    "shirt",
    "t-shirt",
    "hoodie",
    "jacket",
    "jeans",
    "dress",
    "kurta",
    "blazer",
    "coat",
    "skirt",
    "trousers",
    "shorts"
]


def extract_field(text: str, keywords):

    lower = text.lower()

    for word in keywords:
        if word in lower:
            return word

    return None


def infer_category(garment):

    mapping = {

        "shirt": "topwear",
        "t-shirt": "topwear",
        "hoodie": "topwear",
        "jacket": "outerwear",
        "coat": "outerwear",
        "blazer": "outerwear",

        "jeans": "bottomwear",
        "trousers": "bottomwear",
        "shorts": "bottomwear",
        "skirt": "bottomwear",

        "dress": "onepiece",
        "kurta": "ethnic"
    }

    return mapping.get(garment)


def infer_gender(text):

    lower = text.lower()

    if "women" in lower or "woman" in lower or "female" in lower:
        return "women"

    if "men" in lower or "male" in lower:
        return "men"

    return "unisex"


def infer_fit(text):

    lower = text.lower()

    if "oversized" in lower:
        return "oversized"

    if "slim" in lower:
        return "slim"

    if "loose" in lower:
        return "loose"

    return "regular"


def infer_style(text):

    lower = text.lower()

    if "formal" in lower:
        return "formal"

    if "sport" in lower:
        return "sports"

    if "party" in lower:
        return "party"

    return "casual"


def infer_season(text):

    lower = text.lower()

    if "winter" in lower:
        return "winter"

    if "summer" in lower:
        return "summer"

    return "all-season"


def infer_occasion(style):

    if style == "formal":
        return "office"

    if style == "party":
        return "party"

    if style == "sports":
        return "sports"

    return "daily"


def parse_description(description: str):

    garment = extract_field(
        description,
        GARMENTS
    )

    color = extract_field(
        description,
        COLORS
    )

    fabric = extract_field(
        description,
        FABRICS
    )

    pattern = extract_field(
        description,
        PATTERNS
    )

    sleeve = extract_field(
        description,
        [
            "sleeveless",
            "short",
            "half",
            "full"
        ]
    )

    style = infer_style(description)

    return {

        "garment_type": garment,

        "category": infer_category(
            garment
        ),

        "primary_color": color,

        "secondary_color": None,

        "fabric": fabric,

        "pattern": pattern,

        "sleeve": sleeve,

        "fit": infer_fit(
            description
        ),

        "style": style,

        "occasion": infer_occasion(
            style
        ),

        "gender": infer_gender(
            description
        ),

        "season": infer_season(
            description
        ),

        "confidence": 0.90

    }