"""vocabulary — word lists and the carrier phrase each word speaks as"""

# Validate the whole pipeline on CORE_WORDS first; only widen to
# FULL_WORDS once the confusion matrix on the core set is clean.
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

# Active vocabulary. Point at FULL_WORDS once the core set separates.
WORDS = CORE_WORDS

# Fills in context before later development
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

# Every word must be speakable, or the action layer has nothing to say.
_missing = [w for w in FULL_WORDS if w not in CARRIER]
if _missing:
    raise ValueError(f"CARRIER missing entries for: {_missing}")
