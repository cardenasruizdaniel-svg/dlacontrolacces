# Import all models to ensure SQLAlchemy mappers are configured in correct order.
# Company references "Client" via string, so models_clients must be imported before
# any code that triggers Company mapper configuration.

# Phase 1: Base models (no cross-references to other model files)
from app.shared.database.models_company import Company, Branch  # noqa: F401

# Phase 2: Client models (imports Company at bottom)
from app.shared.database.models_clients import (  # noqa: F401
    Client, ClientContact, ClientLocation, Patient, Persona, Project,
)

# Phase 3: HR models (imports Company at bottom)
from app.shared.database.models_hr import (  # noqa: F401
    Employee, Department, JobPosition, CostCenter, WorkTeam,
    EmployeeDotacion, EmployeeDocument,
)

# Phase 4: Auth models (imports Employee, Role at bottom)
from app.shared.database.models_auth import (  # noqa: F401
    User, UserSession, AuditLog, Role, Permission, RolePermission,
)

# Phase 5: Other models
from app.shared.database.models_contract import Contract, ContractType  # noqa: F401
from app.shared.database.models_geolocation import Geofence, LocationHistory, RouteHistory  # noqa: F401
from app.shared.database.models_payroll import PayrollPeriod, PayrollRecord, PayrollConcept  # noqa: F401
