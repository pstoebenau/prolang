---
license: cc-by-4.0
language:
- de
tags:
- speech
- audio
- tts
- thorsten-voice
- german
size_categories:
- 10K<n<100K
---

# Thorsten-Voice TV-24kHz-Neutral Dataset

This dataset is a resampled version of the "TV-2022.10-Neutral" configuration from the original [Thorsten-Voice TV-44kHz-Full](https://huggingface.co/datasets/Thorsten-Voice/TV-44kHz-Full) dataset, converted from 44.1kHz to 24kHz sampling rate.

## Dataset Description

The Thorsten-Voice dataset contains German speech recordings by Thorsten Müller, suitable for text-to-speech (TTS) training and other speech synthesis tasks.

### Changes from Original
- **Sample Rate**: Converted from 44.1kHz to 24kHz
- **Format**: Maintained in Parquet format for efficient loading
- **Content**: All other metadata and text content remains identical

### Use Cases
- Text-to-Speech (TTS) model training
- German speech synthesis research
- Voice cloning applications
- Speech processing experiments

## Loading the Dataset

```python
from datasets import load_dataset

dataset = load_dataset("Thorsten-Voice/TV-24kHz-Neutral")
```

## Citation

If you use this dataset, please cite the original Thorsten-Voice work:

```
@misc{thorsten-voice,
  title={Thorsten-Voice},
  author={Thorsten Müller},
  year={2022},
  url={https://github.com/thorstenMueller/Thorsten-Voice}
}
```

## License

This dataset maintains the same CC-BY-4.0 license as the original Thorsten-Voice dataset.
