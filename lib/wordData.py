"""vocabulary — word lists and the carrier phrase each word speaks as

Validate the whole pipeline on CORE_WORDS first; only widen to FULL_WORDS once
the confusion matrix on the core set is clean.
"""

# Word Lists
CORE_WORDS = [
    "yes",
    "no",
    "help",
    "water",
    "stop",
    "more",
    "hello",
    "how",
    "are",
    "you",
    "okay",
]

FULL_WORDS = CORE_WORDS + [
    "pain",
    "call",
    "bathroom",
    "thanks",
    "hungry",
    "tired",
]

WORDS = CORE_WORDS

# Carrier Phrases
CARRIER = {
    "yes": "Yes",
    "no": "No",
    "help": "I need help",
    "water": "I need water",
    "stop": "Please stop",
    "more": "I would like more",
    "hello": "Hello",
    "how": "how",
    "are": "are",
    "you": "you",
    "pain": "I am in pain",
    "call": "Please call someone",
    "bathroom": "I need the bathroom",
    "thanks": "Thank you",
    "hungry": "I am hungry",
    "tired": "I am tired",
    "okay": "Okay",
}

# Validation
_missing = [w for w in FULL_WORDS if w not in CARRIER]
if _missing:
    raise ValueError(f"CARRIER missing entries for: {_missing}")
