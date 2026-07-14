from services.garment_schema import GarmentSchema


BOTTOMWEAR = {
    "jeans",
    "trousers",
    "shorts",
    "skirt"
}

TOPWEAR = {
    "shirt",
    "t-shirt",
    "hoodie",
    "jacket",
    "coat",
    "blazer",
    "kurta"
}


def validate(schema: GarmentSchema):

    if schema.garment_type in BOTTOMWEAR:

        schema.sleeve = None

    if schema.garment_type in BOTTOMWEAR:

        schema.fit = schema.fit or "regular"

    if schema.garment_type in TOPWEAR:

        pass

    if schema.pattern is None:

        schema.pattern = "solid"

    if schema.fabric is None:

        schema.fabric = "unknown"

    return schema