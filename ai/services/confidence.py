from services.garment_schema import GarmentSchema


def compute_confidence(schema: GarmentSchema):

    score = 0.40

    fields = [

        schema.garment_type,
        schema.category,
        schema.primary_color,
        schema.fabric,
        schema.pattern,
        schema.fit,
        schema.style,
        schema.gender,
        schema.season

    ]

    for field in fields:

        if field is not None:

            score += 0.06

    if schema.fabric == "unknown":

        score -= 0.08

    if score > 1:

        score = 1

    if score < 0:

        score = 0

    return round(score, 2)