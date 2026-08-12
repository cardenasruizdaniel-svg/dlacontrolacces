"""Expand photo_url and facial_photo_url to Text for base64 storage

Revision ID: h1_photo_url_to_text
Revises: g3_add_is_auto_exit
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = "h1_photo_url_to_text"
down_revision = "g3_add_is_auto_exit"
branch_labels = None
depends_on = None


def upgrade():
    # ALTER COLUMN photo_url: String(500) → Text (unlimited, needed for base64 images)
    op.alter_column(
        "employees",
        "photo_url",
        existing_type=sa.String(500),
        type_=sa.Text(),
        existing_nullable=True,
    )
    # ALTER COLUMN facial_photo_url: String(500) → Text
    op.alter_column(
        "employees",
        "facial_photo_url",
        existing_type=sa.String(500),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade():
    op.alter_column(
        "employees",
        "photo_url",
        existing_type=sa.Text(),
        type_=sa.String(500),
        existing_nullable=True,
    )
    op.alter_column(
        "employees",
        "facial_photo_url",
        existing_type=sa.Text(),
        type_=sa.String(500),
        existing_nullable=True,
    )
