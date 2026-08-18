import cv2
import numpy as np
from scipy import ndimage


class MaskRefiner:

    def __init__(
        self,
        closing_kernel=11,
        opening_kernel=5,
        blur_kernel=5,
    ):
        self.closing_kernel = closing_kernel
        self.opening_kernel = opening_kernel
        self.blur_kernel = blur_kernel

    def remove_noise(self, mask):

        kernel = np.ones(
            (self.opening_kernel, self.opening_kernel),
            np.uint8,
        )

        return cv2.morphologyEx(
            mask,
            cv2.MORPH_OPEN,
            kernel,
        )

    def fill_small_holes(self, mask):

        kernel = np.ones(
            (self.closing_kernel, self.closing_kernel),
            np.uint8,
        )

        return cv2.morphologyEx(
            mask,
            cv2.MORPH_CLOSE,
            kernel,
        )

    def keep_largest_component(self, mask):

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            mask,
            connectivity=8,
        )

        if num_labels <= 1:
            return mask

        largest = 1 + np.argmax(
            stats[1:, cv2.CC_STAT_AREA]
        )

        output = np.zeros_like(mask)

        output[labels == largest] = 255

        return output

    def fill_internal_holes(self, mask):

        binary = mask > 0

        filled = ndimage.binary_fill_holes(binary)

        return (filled.astype(np.uint8) * 255)

    def smooth_edges(self, mask):

        blurred = cv2.GaussianBlur(
            mask,
            (self.blur_kernel, self.blur_kernel),
            0,
        )

        _, binary = cv2.threshold(
            blurred,
            127,
            255,
            cv2.THRESH_BINARY,
        )

        return binary

    def refine(self, mask):

        mask = self.remove_noise(mask)

        mask = self.fill_small_holes(mask)

        mask = self.keep_largest_component(mask)

        mask = self.fill_internal_holes(mask)

        mask = self.smooth_edges(mask)

        return mask


refiner = MaskRefiner()


def refine_mask(mask: np.ndarray):

    """
    Input:
        Binary mask
        uint8
        values = 0 / 255

    Output:
        Refined binary mask
    """

    if mask.dtype != np.uint8:
        mask = mask.astype(np.uint8)

    if mask.max() <= 1:
        mask *= 255

    return refiner.refine(mask)