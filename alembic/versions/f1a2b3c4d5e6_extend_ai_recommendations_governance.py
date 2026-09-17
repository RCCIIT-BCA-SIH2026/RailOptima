"""Extend ai_recommendations with governance and approval workflow fields

Revision ID: f1a2b3c4d5e6
Revises: e68567a8d193
Create Date: 2026-09-18 03:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e68567a8d193'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Allow block_id to be nullable
    op.alter_column('ai_recommendations', 'block_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('ai_recommendations', 'strategy_name',
               existing_type=sa.VARCHAR(length=100),
               nullable=True)
    op.alter_column('ai_recommendations', 'rationale_text',
               existing_type=sa.TEXT(),
               nullable=True)

    # Add workflow columns
    op.add_column('ai_recommendations', sa.Column('asset_id', sa.Integer(), sa.ForeignKey('assets.id'), nullable=True))
    op.add_column('ai_recommendations', sa.Column('asset_code', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('task_id', sa.Integer(), sa.ForeignKey('maintenance_tasks.id'), nullable=True))
    op.add_column('ai_recommendations', sa.Column('department_code', sa.String(length=20), server_default='ENG', nullable=False))
    op.add_column('ai_recommendations', sa.Column('recommendation_code', sa.String(length=50), nullable=True, unique=True))
    op.add_column('ai_recommendations', sa.Column('recommendation_type', sa.String(length=50), server_default='PREDICTIVE_MAINTENANCE', nullable=False))
    op.add_column('ai_recommendations', sa.Column('source_module', sa.String(length=50), server_default='ai_predictive_maintenance', nullable=False))
    op.add_column('ai_recommendations', sa.Column('entity_type', sa.String(length=50), server_default='ASSET', nullable=False))
    op.add_column('ai_recommendations', sa.Column('entity_id', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('title', sa.String(length=255), nullable=True))
    op.add_column('ai_recommendations', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('location', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('prediction', sa.String(length=50), nullable=True))
    op.add_column('ai_recommendations', sa.Column('probability', sa.Float(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('maintenance_probability', sa.Float(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('maintenance_required', sa.Boolean(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('risk_level', sa.String(length=20), server_default='Medium', nullable=True))
    op.add_column('ai_recommendations', sa.Column('top_risk_factors', sa.JSON(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('recommended_action', sa.Text(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('model_type', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('model_version', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('predicted_delay_minutes', sa.Float(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('predicted_eta', sa.DateTime(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('scheduled_arrival', sa.DateTime(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('status', sa.String(length=30), server_default='PENDING_REVIEW', nullable=False))
    op.add_column('ai_recommendations', sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('ai_recommendations', sa.Column('reviewed_at', sa.DateTime(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('ai_recommendations', sa.Column('reviewer_name', sa.String(length=100), nullable=True))
    op.add_column('ai_recommendations', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('ai_recommendations', sa.Column('approval_comment', sa.Text(), nullable=True))


def downgrade() -> None:
    pass

