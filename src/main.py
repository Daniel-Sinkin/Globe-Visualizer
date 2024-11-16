from pathlib import Path
from typing import Literal, NotRequired, TypeAlias, TypedDict

import ujson as json  # type: ignore

border_data_fp = Path("data").joinpath("world-administrative-boundaries.geojson")


Coordinates: TypeAlias = list[float]


class GeoJSONCoodinates(TypedDict):
    type: str
    coordinates: Coordinates


class GeoJSONGeometry(TypedDict):
    type: Literal["MultiPolygon", "Polygon"]
    coordinates: list[GeoJSONCoodinates]


class GeoJSONProperty_LON_LAT(TypedDict):
    lon: float
    lat: float


Continents = Literal["Americas", "Oceania", "Europe", "Africa", "Asia", "Antarctica"]


class GeoJSONProperty(TypedDict):
    geo_point_2d: GeoJSONProperty_LON_LAT
    iso3: str
    status: str
    color_code: str
    name: str
    continent: Continents
    region: str
    iso_3166_1_alpha_2_codes: NotRequired[str]
    french_short: NotRequired[str]


class GeoJSONFeature(TypedDict):
    type: Literal["Feature"]
    geometry: GeoJSONGeometry
    properties: GeoJSONProperty


class GeoJSON(TypedDict):
    type: str
    features: list[GeoJSONFeature]


def main() -> None:
    with open(border_data_fp, "r") as file:
        geo_data: GeoJSON = json.load(file)

    assert geo_data["type"] == "FeatureCollection"
    features = geo_data["features"]

    continents = list({feature["properties"]["continent"] for feature in features})
    continent_to_countries_map: dict[str, list[str]] = dict.fromkeys(continents, [])

    for feature in features:
        properties = feature["properties"]
        continent_to_countries_map[properties["continent"]].append(properties["name"])

    lines = [
        json.dumps(
            {
                "lon": feature["properties"]["geo_point_2d"]["lon"],
                "lat": feature["properties"]["geo_point_2d"]["lat"],
                "country": feature["properties"]["name"],
                "continent": feature["properties"]["continent"],
            }
        )
        + "\n"
        for feature in features
    ]
    with open("data/dots.ndjson", "w") as file:
        file.writelines(lines)


if __name__ == "__main__":
    main()
