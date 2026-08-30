"""vocabulary — the word lists the interface is trained and demoed on

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
