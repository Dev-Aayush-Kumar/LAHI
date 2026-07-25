from preprocessing.video_pipeline import preprocess_video


def process_pipeline(
    video_path: str
):

    result = preprocess_video(
        video_path
    )

    return {
        "success": True,
        **result
    }