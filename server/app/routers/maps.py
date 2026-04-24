"""Google Maps API - Geocoding and Places Autocomplete."""
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

router = APIRouter(prefix="/api/maps", tags=["maps"])


def _require_api_key():
    if not settings.google_maps_api_key:
        raise HTTPException(
            status_code=503,
            detail="Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in environment.",
        )


@router.get("/geocode")
async def geocode(address: str = Query(..., min_length=3)):
    """Convert address to lat/lng using Google Geocoding API."""
    _require_api_key()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "address": address,
                "key": settings.google_maps_api_key,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()
    if data.get("status") != "OK":
        raise HTTPException(status_code=404, detail=f"Geocoding failed: {data.get('status', 'UNKNOWN')}")
    results = data.get("results", [])
    if not results:
        return {"results": [], "location": None}
    loc = results[0]["geometry"]["location"]
    formatted = results[0].get("formatted_address", address)
    return {
        "results": [
            {
                "formatted_address": r.get("formatted_address"),
                "place_id": r.get("place_id"),
                "location": r["geometry"]["location"],
            }
            for r in results[:5]
        ],
        "location": {"lat": loc["lat"], "lng": loc["lng"], "formatted_address": formatted},
    }


@router.get("/reverse-geocode")
async def reverse_geocode(lat: float = Query(...), lng: float = Query(...)):
    """Convert lat/lng to address using Google Geocoding API."""
    _require_api_key()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "latlng": f"{lat},{lng}",
                "key": settings.google_maps_api_key,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(status_code=404, detail=f"Reverse geocoding failed: {data.get('status', 'UNKNOWN')}")
    results = data.get("results", [])
    if not results:
        return {"address": None, "results": []}
    return {
        "address": results[0].get("formatted_address"),
        "results": [
            {"formatted_address": r.get("formatted_address"), "place_id": r.get("place_id")}
            for r in results[:5]
        ],
    }


@router.get("/places/autocomplete")
async def places_autocomplete(
    input: str = Query(..., min_length=2, alias="input"),
    session_token: Optional[str] = Query(None, description="Session token for billing"),
):
    """Address autocomplete suggestions using Google Places Autocomplete API."""
    _require_api_key()
    params = {
        "input": input,
        "key": settings.google_maps_api_key,
        "types": "address",
    }
    if session_token:
        params["sessiontoken"] = session_token
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/place/autocomplete/json",
            params=params,
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(status_code=400, detail=f"Autocomplete failed: {data.get('status', 'UNKNOWN')}")
    predictions = data.get("predictions", [])
    return {
        "predictions": [
            {
                "place_id": p.get("place_id"),
                "description": p.get("description"),
                "structured_formatting": p.get("structured_formatting"),
            }
            for p in predictions
        ],
    }


@router.get("/places/details")
async def place_details(place_id: str = Query(...)):
    """Get place details (address, lat/lng) by place_id."""
    _require_api_key()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": "place_id,formatted_address,geometry",
                "key": settings.google_maps_api_key,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()
    if data.get("status") != "OK":
        raise HTTPException(status_code=404, detail=f"Place not found: {data.get('status', 'UNKNOWN')}")
    result = data.get("result", {})
    geom = result.get("geometry", {})
    loc = geom.get("location", {})
    return {
        "place_id": result.get("place_id"),
        "formatted_address": result.get("formatted_address"),
        "location": {"lat": loc.get("lat"), "lng": loc.get("lng")},
    }
