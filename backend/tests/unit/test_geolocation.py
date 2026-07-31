import pytest
from app.modules.geolocation.application.service import GeolocationService


def test_haversine_distance_same_point():
    lat, lon = 4.60971, -74.08175  # Bogota center
    dist = GeolocationService.haversine_distance(lat, lon, lat, lon)
    assert dist == 0.0


def test_haversine_distance_known_points():
    # Distance between Bogota center (4.60971, -74.08175) and Unicentro (4.7011, -74.0332) ~ 11.5 km
    dist = GeolocationService.haversine_distance(4.60971, -74.08175, 4.7011, -74.0332)
    assert 11000 < dist < 12500


def test_check_geofence_inside_and_outside():
    svc = GeolocationService(geofence_repo=None, location_repo=None, route_repo=None)
    center_lat, center_lon = 4.60971, -74.08175
    
    # 20 meters away
    near_lat, near_lon = 4.60980, -74.08175
    res_near = svc.check_geofence(near_lat, near_lon, center_lat, center_lon, radius=100.0)
    assert res_near["inside"] is True

    # 10 km away
    far_lat, far_lon = 4.7011, -74.0332
    res_far = svc.check_geofence(far_lat, far_lon, center_lat, center_lon, radius=100.0)
    assert res_far["inside"] is False
