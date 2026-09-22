import re
from typing import List, Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class PageElement(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = Field(None, max_length=100)
    tag: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = Field(None, max_length=50)
    selector: Optional[str] = Field(None, max_length=250)
    text_content: Optional[str] = Field(None, max_length=500)
    label: Optional[str] = Field(None, max_length=200)
    role: Optional[str] = Field(None, max_length=50)
    is_interactive: Optional[bool] = True


class SanitizedContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    page_title: Optional[str] = Field(None, max_length=200)
    page_url: Optional[str] = Field(None, max_length=500)
    sanitized_elements: List[PageElement] = Field(default_factory=list, max_length=200)
    sanitized_dom_skeleton: str = Field(default="")
    redacted_screenshot_base64: Optional[str] = None
    redaction_verified: bool = Field(True, description="Certified by M2 On-Device Privacy Guard")
    redacted_token_count: int = Field(0, ge=0)


    @model_validator(mode="before")
    @classmethod
    def check_forbidden_sensitive_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            forbidden = [
                "password", "passwd", "otp", "pin", "cvv", "secret_key", 
                "raw_screenshot", "card_number", "bank_account", "api_key"
            ]
            for k in data.keys():
                if k.lower() in forbidden:
                    raise ValueError(f"SENSITIVE_KEY_DETECTED: Forbidden key '{k}' found in context.")
        return data

    @field_validator("sanitized_elements")
    @classmethod
    def defense_in_depth_pii_check(cls, elements: List[PageElement]) -> List[PageElement]:
        aadhaar_pattern = re.compile(r"\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b")
        pan_pattern = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
        card_pattern = re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b")
        otp_pattern = re.compile(r"\b(?:otp|one[- ]time[- ]pass(?:word)?)\s*[:=]\s*\d{4,8}\b", re.IGNORECASE)
        cvv_pattern = re.compile(r"\b(?:cvv|cvc|security[- ]code)\s*[:=]\s*\d{3,4}\b", re.IGNORECASE)
        pwd_pattern = re.compile(r"\b(?:password|passwd)\s*[:=]\s*\S+\b", re.IGNORECASE)

        for el in elements:
            text = (el.text_content or "") + " " + (el.label or "")
            if aadhaar_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Raw Aadhaar format detected in unredacted element.")
            if pan_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Raw PAN format detected in unredacted element.")
            if card_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Credit/Debit card number detected in unredacted element.")
            if otp_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Raw OTP detected in unredacted element.")
            if cvv_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Raw CVV detected in unredacted element.")
            if pwd_pattern.search(text):
                raise ValueError("PII_LEAK_DETECTED: Raw password detected in unredacted element.")
        return elements


class AnalyzeRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    url: str = Field(..., max_length=500)
    page_title: Optional[str] = Field(None, max_length=200)
    sanitized_context: SanitizedContext

    @field_validator("session_id")
    @classmethod
    def validate_session_id_chars(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError("SESSION_ID_INVALID: Only alphanumeric characters, hyphens, and underscores are allowed.")
        return v


class AnalyzeResponse(BaseModel):
    status: str = "ACCEPTED"
    session_id: str
    sanitized_element_count: int
    privacy_verified: bool
    summary: str
    server_timestamp: str
