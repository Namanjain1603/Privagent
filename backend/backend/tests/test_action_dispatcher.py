import pytest
from backend.schemas.action import Action, ActionType
from backend.services.action_dispatcher import ActionDispatcher

def test_dispatcher_scroll_up():
    """1. SCROLL up"""
    act = Action(type=ActionType.SCROLL, direction="up", amount=100)
    env = ActionDispatcher.create_m3_envelope("req-1", act)
    assert env["requestId"] == "req-1"
    assert env["message"]["type"] == "ACTION_REQUEST"
    assert env["message"]["action"]["type"] == "SCROLL"
    assert env["message"]["action"]["direction"] == "up"
    assert env["message"]["action"]["amount"] == 100

def test_dispatcher_scroll_down():
    """2. SCROLL down"""
    act = Action(type=ActionType.SCROLL, direction="down")
    env = ActionDispatcher.create_m3_envelope("req-2", act)
    assert env["message"]["action"]["type"] == "SCROLL"
    assert env["message"]["action"]["direction"] == "down"
    assert "amount" not in env["message"]["action"]

def test_dispatcher_click():
    """9. valid CLICK still works"""
    act = Action(type=ActionType.CLICK, target="#btn")
    env = ActionDispatcher.create_m3_envelope("r", act)
    assert env["message"]["action"]["type"] == "CLICK"
    assert env["message"]["action"]["target"] == "#btn"

def test_dispatcher_type():
    """10. valid TYPE still works"""
    act = Action(type=ActionType.TYPE, target="#inp", value="text")
    env = ActionDispatcher.create_m3_envelope("r", act)
    assert env["message"]["action"]["type"] == "TYPE"
    assert env["message"]["action"]["target"] == "#inp"
    assert env["message"]["action"]["value"] == "text"

def test_dispatcher_select():
    """11. valid SELECT still works"""
    act = Action(type=ActionType.SELECT, target="#sel", value="opt")
    env = ActionDispatcher.create_m3_envelope("r", act)
    assert env["message"]["action"]["type"] == "SELECT"
    assert env["message"]["action"]["target"] == "#sel"
    assert env["message"]["action"]["value"] == "opt"

def test_dispatcher_navigate():
    """12. valid NAVIGATE still works"""
    act = Action(type=ActionType.NAVIGATE, target="https://example.com")
    env = ActionDispatcher.create_m3_envelope("r", act)
    assert env["message"]["action"]["type"] == "NAVIGATE"
    assert env["message"]["action"]["url"] == "https://example.com"
    assert "target" not in env["message"]["action"]
