"""Learner profiles: results and calibration become per-profile.

Existing rows belong to the implicit `default` profile, whose calibration row already uses the
id `default`.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-17
"""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

DEFAULT_PROFILE_ID = "default"


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.execute(
        sa.text(
            "INSERT INTO profiles (id, name, created_at) VALUES (:id, :name, CURRENT_TIMESTAMP)"
        ).bindparams(id=DEFAULT_PROFILE_ID, name="Người học")
    )
    op.add_column(
        "assessment_runs",
        sa.Column("profile_id", sa.String(32), nullable=False, server_default=DEFAULT_PROFILE_ID),
    )
    op.create_index("ix_assessment_runs_profile_id", "assessment_runs", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_assessment_runs_profile_id", table_name="assessment_runs")
    with op.batch_alter_table("assessment_runs") as batch:
        batch.drop_column("profile_id")
    op.drop_table("profiles")
