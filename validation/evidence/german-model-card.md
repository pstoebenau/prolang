---
language: de
license: apache-2.0
datasets:
- common_voice
- mozilla-foundation/common_voice_6_0
metrics:
- wer
- cer
tags:
- audio
- automatic-speech-recognition
- de
- hf-asr-leaderboard
- mozilla-foundation/common_voice_6_0
- robust-speech-event
- speech
- xlsr-fine-tuning-week
model-index:
- name: XLSR Wav2Vec2 German by Jonatas Grosman
  results:
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: Common Voice de
      type: common_voice
      args: de
    metrics:
    - name: Test WER
      type: wer
      value: 12.06
    - name: Test CER
      type: cer
      value: 2.92
    - name: Test WER (+LM)
      type: wer
      value: 8.74
    - name: Test CER (+LM)
      type: cer
      value: 2.28
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: Robust Speech Event - Dev Data
      type: speech-recognition-community-v2/dev_data
      args: de
    metrics:
    - name: Dev WER
      type: wer
      value: 32.75
    - name: Dev CER
      type: cer
      value: 13.64
    - name: Dev WER (+LM)
      type: wer
      value: 26.6
    - name: Dev CER (+LM)
      type: cer
      value: 12.58
---

# Fine-tuned XLSR-53 large model for speech recognition in German

Fine-tuned [facebook/wav2vec2-large-xlsr-53](https://huggingface.co/facebook/wav2vec2-large-xlsr-53) on German using the train and validation splits of [Common Voice 6.1](https://huggingface.co/datasets/common_voice).
When using this model, make sure that your speech input is sampled at 16kHz.

This model has been fine-tuned thanks to the GPU credits generously given by the [OVHcloud](https://www.ovhcloud.com/en/public-cloud/ai-training/) :)

The script used for training can be found here: https://github.com/jonatasgrosman/wav2vec2-sprint

## Usage

The model can be used directly (without a language model) as follows...

Using the [HuggingSound](https://github.com/jonatasgrosman/huggingsound) library:

```python
from huggingsound import SpeechRecognitionModel

model = SpeechRecognitionModel("jonatasgrosman/wav2vec2-large-xlsr-53-german")
audio_paths = ["/path/to/file.mp3", "/path/to/another_file.wav"]

transcriptions = model.transcribe(audio_paths)
```

Writing your own inference script:

```python
import torch
import librosa
from datasets import load_dataset
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

LANG_ID = "de"
MODEL_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-german"
SAMPLES = 10

test_dataset = load_dataset("common_voice", LANG_ID, split=f"test[:{SAMPLES}]")

processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)

# Preprocessing the datasets.
# We need to read the audio files as arrays
def speech_file_to_array_fn(batch):
    speech_array, sampling_rate = librosa.load(batch["path"], sr=16_000)
    batch["speech"] = speech_array
    batch["sentence"] = batch["sentence"].upper()
    return batch

test_dataset = test_dataset.map(speech_file_to_array_fn)
inputs = processor(test_dataset["speech"], sampling_rate=16_000, return_tensors="pt", padding=True)

with torch.no_grad():
    logits = model(inputs.input_values, attention_mask=inputs.attention_mask).logits

predicted_ids = torch.argmax(logits, dim=-1)
predicted_sentences = processor.batch_decode(predicted_ids)

for i, predicted_sentence in enumerate(predicted_sentences):
    print("-" * 100)
    print("Reference:", test_dataset[i]["sentence"])
    print("Prediction:", predicted_sentence)
```

| Reference  | Prediction |
| ------------- | ------------- |
| ZIEHT EUCH BITTE DRAUSSEN DIE SCHUHE AUS. | ZIEHT EUCH BITTE DRAUSSEN DIE SCHUHE AUS |
| ES KOMMT ZUM SHOWDOWN IN GSTAAD. | ES KOMMT ZUG STUNDEDAUTENESTERKT |
| IHRE FOTOSTRECKEN ERSCHIENEN IN MODEMAGAZINEN WIE DER VOGUE, HARPER’S BAZAAR UND MARIE CLAIRE. | IHRE FOTELSTRECKEN ERSCHIENEN MIT MODEMAGAZINEN WIE DER VALG AT DAS BASIN MA RIQUAIR |
| FELIPE HAT EINE AUCH FÜR MONARCHEN UNGEWÖHNLICH LANGE TITELLISTE. | FELIPPE HAT EINE AUCH FÜR MONACHEN UNGEWÖHNLICH LANGE TITELLISTE |
| ER WURDE ZU EHREN DES REICHSKANZLERS OTTO VON BISMARCK ERRICHTET. | ER WURDE ZU EHREN DES REICHSKANZLERS OTTO VON BISMARCK ERRICHTET   M |
| WAS SOLLS, ICH BIN BEREIT. | WAS SOLL'S ICH BIN BEREIT |
| DAS INTERNET BESTEHT AUS VIELEN COMPUTERN, DIE MITEINANDER VERBUNDEN SIND. | DAS INTERNET BESTEHT AUS VIELEN COMPUTERN DIE MITEINANDER VERBUNDEN SIND |
| DER URANUS IST DER SIEBENTE PLANET IN UNSEREM SONNENSYSTEM. | DER URANUS IST DER SIEBENTE PLANET IN UNSEREM SONNENSYSTEM |
| DIE WAGEN ERHIELTEN EIN EINHEITLICHES ERSCHEINUNGSBILD IN WEISS MIT ROTEM FENSTERBAND. | DIE WAGEN ERHIELTEN EIN EINHEITLICHES ERSCHEINUNGSBILD IN WEISS MIT ROTEM FENSTERBAND |
| SIE WAR DIE COUSINE VON CARL MARIA VON WEBER. | SIE WAR DIE COUSINE VON KARL-MARIA VON WEBER |

## Evaluation

1. To evaluate on `mozilla-foundation/common_voice_6_0` with split `test`

```bash
python eval.py --model_id jonatasgrosman/wav2vec2-large-xlsr-53-german --dataset mozilla-foundation/common_voice_6_0 --config de --split test
```

2. To evaluate on `speech-recognition-community-v2/dev_data`

```bash
python eval.py --model_id jonatasgrosman/wav2vec2-large-xlsr-53-german --dataset speech-recognition-community-v2/dev_data --config de --split validation --chunk_length_s 5.0 --stride_length_s 1.0
```

## Citation
If you want to cite this model you can use this:

```bibtex
@misc{grosman2021xlsr53-large-german,
  title={Fine-tuned {XLSR}-53 large model for speech recognition in {G}erman},
  author={Grosman, Jonatas},
  howpublished={\url{https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-german}},
  year={2021}
}
```