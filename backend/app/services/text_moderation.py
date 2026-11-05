import re
from typing import Dict, List, Any, Tuple
from app.config import settings


# Configurable categories with associated keywords/phrases and severity weights
# Severity weights directly influence the deterministic risk score:
# - High severity (weight >= 70): Directly pushes score into Blocked range (>= 70)
# - Medium severity (weight 35 - 65): Pushes score into Flagged range (30 - 69)
# - Low severity (weight 15 - 30): Mild warning or minor offense
HARMFUL_PATTERNS = {
    "Threats & Violence": {
        "weight": 85,
        "keywords": [
            "kill you", "kill yourself", "murder", "bomb", "assassinate",
            "slaughter", "shoot you", "cut your throat", "stab you",
            "terrorist attack", "mass shooting", "death threat", "execute them"
        ]
    },
    "Hate Speech": {
        "weight": 75,
        "keywords": [
            "hate all", "subhuman", "racial slur", "exterminate them",
            "white supremacy", "ethnic cleansing", "go back to your country",
            "inferior race", "filthy immigrant"
        ]
    },
    "Harassment & Abuse": {
        "weight": 50,
        "keywords": [
            "nobody likes you", "go die", "you are worthless",
            "loser", "idiot", "moron", "scumbag", "pathetic creature",
            "ugly freak", "disgusting pig"
        ]
    },
    "Profanity & Obscenity": {
        "weight": 40,
        "keywords": [
            "fuck", "shit", "bitch", "bastard", "asshole",
            "cunt", "dick", "piss off", "motherfucker", "bullshit"
        ]
    }
}

# Configurable spam indicators
SPAM_PHRASES = [
    "click here now", "free money", "claim your prize", "congratulations you won",
    "crypto giveaway", "double your bitcoin", "risk-free investment", "100% guaranteed profit",
    "wire transfer urgently", "earn $1000 daily", "work from home make thousands",
    "limited time offer act fast", "exclusive deal click link", "whatsapp me for free"
]


def detect_spam_patterns(text: str) -> Tuple[int, List[str]]:
    """
    Detect spam characteristics in the text:
    1. Known spam marketing phrases
    2. Excessive capitalization (e.g. ALL CAPS SHOUTING)
    3. Repeated identical words / character floods
    4. Multiple embedded URLs
    Returns (spam_risk_score, list_of_triggers)
    """
    spam_score = 0
    triggers = []
    lower_text = text.lower()

    # 1. Match spam phrases
    matched_spam_phrases = [phrase for phrase in SPAM_PHRASES if phrase in lower_text]
    if matched_spam_phrases:
        spam_score += 40 + min(len(matched_spam_phrases) * 10, 30)
        triggers.append(f"Spam phrases detected: {', '.join(matched_spam_phrases)}")

    # 2. Check for excessive capitalization (shouting)
    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 15:
        upper_count = sum(1 for c in letters if c.isupper())
        upper_ratio = upper_count / len(letters)
        if upper_ratio > 0.65:
            spam_score += 35
            triggers.append(f"Excessive capitalization ({int(upper_ratio * 100)}% uppercase)")

    # 3. Check for repeated characters or repeated words
    repeated_chars = re.findall(r'(.)\1{4,}', text)
    if repeated_chars:
        spam_score += 25
        triggers.append(f"Excessive character repetition ('{repeated_chars[0]}'*5+)")

    # Repeated words (e.g. "free free free free")
    repeated_words = re.findall(r'\b(\w+)\s+\1\s+\1\b', lower_text)
    if repeated_words:
        spam_score += 25
        triggers.append(f"Repetitive word flood: '{repeated_words[0]}'")

    # 4. Check for multiple URLs
    url_matches = re.findall(r'https?://[^\s]+|www\.[^\s]+', text, re.IGNORECASE)
    if len(url_matches) >= 2:
        spam_score += 30
        triggers.append(f"Multiple URLs detected ({len(url_matches)} links)")

    return min(spam_score, 75), triggers


def moderate_text(text: str) -> Dict[str, Any]:
    """
    Analyzes submitted text for harmful keywords and spam patterns.
    Produces a deterministic risk score between 0 and 100:
    - Score < 30: Safe
    - Score 30 to 69: Flagged
    - Score >= 70: Blocked
    """
    if not text or not text.strip():
        return {
            "risk_score": 0.0,
            "status": "Safe",
            "confidence_score": 100.0,
            "categories": [],
            "details": {"summary": "Empty text provided."}
        }

    lower_text = text.lower()
    matched_categories: List[str] = []
    matched_details: Dict[str, List[str]] = {}
    highest_category_weight = 0

    # 1. Check harmful keyword patterns with word-boundary awareness
    for category, config in HARMFUL_PATTERNS.items():
        cat_matches = []
        for kw in config["keywords"]:
            # Check for phrase or word boundary
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, lower_text):
                cat_matches.append(kw)

        if cat_matches:
            matched_categories.append(category)
            matched_details[category] = cat_matches
            if config["weight"] > highest_category_weight:
                highest_category_weight = config["weight"]

    # 2. Check spam patterns
    spam_score, spam_triggers = detect_spam_patterns(text)
    if spam_triggers:
        matched_categories.append("Spam & Unsolicited Promotion")
        matched_details["Spam Triggers"] = spam_triggers

    # 3. Calculate deterministic Risk Score (0 to 100)
    # Start with the highest category weight or spam score
    base_score = max(highest_category_weight, spam_score)

    if base_score == 0:
        # Completely clean
        final_risk_score = 0.0
        confidence = 96.5
    else:
        # Additional compounding score if multiple categories trigger
        additional_penalty = (len(matched_categories) - 1) * 8
        final_risk_score = min(float(base_score + additional_penalty), 100.0)

        # Confidence is high when direct keyword or pattern matches are found
        confidence = min(88.0 + (len(matched_categories) * 3.0), 99.0)

    # 4. Map to Status according to user rules
    if final_risk_score < settings.THRESHOLD_FLAGGED:
        status = "Safe"
    elif final_risk_score < settings.THRESHOLD_BLOCKED:
        status = "Flagged"
    else:
        status = "Blocked"

    return {
        "risk_score": round(final_risk_score, 1),
        "status": status,
        "confidence_score": round(confidence, 1),
        "categories": matched_categories,
        "details": {
            "matched_keywords": matched_details,
            "spam_triggers": spam_triggers,
            "character_count": len(text),
            "word_count": len(text.split()),
            "summary": (
                f"Content evaluated as {status} (Risk Score: {final_risk_score}/100). "
                f"{len(matched_categories)} category violation(s) identified."
            )
        }
    }

