from PIL import Image
from services.garment_parser import parse_description
from services.florence_loader import florence
from services.garment_schema import GarmentSchema
from services.garment_validator import validate
from services.confidence import compute_confidence
from services.prompts import MORE_DETAILED_CAPTION

def generate_caption(image_path: str):

    image = Image.open(image_path).convert("RGB")

    prompt = MORE_DETAILED_CAPTION

    inputs = florence.processor(
        text=prompt,
        images=image,
        return_tensors="pt"
    )

    generated_ids = florence.model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=256,
        num_beams=3,
        early_stopping=True
    )

    generated_text = florence.processor.batch_decode(
        generated_ids,
        skip_special_tokens=False
    )[0]

    generated_text = florence.processor.post_process_generation(
        generated_text,
        task=prompt,
        image_size=image.size
    ) 

    description = generated_text[MORE_DETAILED_CAPTION]

    parsed = parse_description(description)

    schema = GarmentSchema(**parsed)
    schema = validate(schema)
    schema.confidence = compute_confidence(
        schema
    )
    return {

        "description": description,

        "parsed": schema.__dict__

    }