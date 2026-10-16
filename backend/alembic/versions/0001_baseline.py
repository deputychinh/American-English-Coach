"""Baseline: assessment runs, phoneme results, calibrations (schema of 2026-10-16).

Revision ID: 0001
Revises:
Create Date: 2026-10-17
"""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessment_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("item_id", sa.String(64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("model_version", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("ok_count", sa.Integer(), nullable=False),
        sa.Column("check_count", sa.Integer(), nullable=False),
        sa.Column("error_count", sa.Integer(), nullable=False),
        sa.Column("result_json", sa.Text(), nullable=False),
        sa.Column("disputed", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_assessment_runs_item_id", "assessment_runs", ["item_id"])
    op.create_table(
        "phoneme_results",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("assessment_runs.id"), nullable=False),
        sa.Column("word", sa.String(64), nullable=False),
        sa.Column("phoneme", sa.String(4), nullable=False),
        sa.Column("verdict", sa.String(8), nullable=False),
        sa.Column("gop", sa.Float(), nullable=False),
        sa.Column("visual", sa.String(16), nullable=False),
        sa.Column("error_id", sa.String(64), nullable=True),
    )
    op.create_index("ix_phoneme_results_run_id", "phoneme_results", ["run_id"])
    op.create_index("ix_phoneme_results_phoneme", "phoneme_results", ["phoneme"])
    op.create_table(
        "calibrations",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("data_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("calibrations")
    op.drop_index("ix_phoneme_results_phoneme", table_name="phoneme_results")
    op.drop_index("ix_phoneme_results_run_id", table_name="phoneme_results")
    op.drop_table("phoneme_results")
    op.drop_index("ix_assessment_runs_item_id", table_name="assessment_runs")
    op.drop_table("assessment_runs")
