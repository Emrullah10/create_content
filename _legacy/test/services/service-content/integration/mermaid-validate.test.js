// Gercek puppeteer + gercek mermaid.parse() ile dogrulama testi. Fixture'lar prod DB'sinden
// cikarilan GERCEK bozuk/gecerli mermaid kaynaklaridir (bkz buglog) — regex tabanli guard'in
// (mermaid_guard.py) 8 orneğin sadece 2'sini yakaladigi, bu yuzden gercek parser'a gecildigi
// dogrulanmisti. Bu test o kararin regresyona ugramadigini garanti eder.
import { makeMermaidRenderer } from '../../../../core/service-content/src/infrastructure/renderer/mermaid-renderer.js';
import { loadMermaidSource } from '../../../../services/create-content-service/src/shared/mermaid-js-source.js';

const KNOWN_INVALID = [
  `erDiagram
    TABLE table_name {
        tenant_id int
        created_at datetime
    }
    INDEX idx_tenant_id {
        tenant_id int
    }
    table_name ||--o{ idx_tenant_id`,
  `erDiagram
    CUSTOMER ||--|{ ORDER
    ORDER }|--)|| CUSTOMER`,
  `sequenceDiagram
  participant Primary as 'Primary Database'
  participant Replica as 'Replica Database'
  Primary->>Replica: Sync data
  note 'Replication lag occurs when data is not synchronized'`,
  `erDiagram
  entity Table {
    * id
    * column_name
  }
  entity Index {
    * index_name
    * column_name
  }
  Table }o-->|{ Index : creates`,
];

const KNOWN_VALID = [
  `sequenceDiagram
  participant QueryPlanner
  participant Database
  QueryPlanner->>Database: Query
  Database->>QueryPlanner: Results`,
  `erDiagram
  TABLE_A {
    int id
    varchar name
  }
  TABLE_B {
    int id
    int table_a_id
  }
  TABLE_A ||--o{ TABLE_B : has`,
  `flowchart LR
    A[PostgreSQL] -->|shared_buffers| B[Buffer Cache]
    B -->|write| C[Disk]`,
];

describe('mermaid-renderer: validateMermaid (real puppeteer + real mermaid parser)', () => {
  let renderer;

  beforeAll(() => {
    renderer = makeMermaidRenderer({ mermaidJsSource: loadMermaidSource() });
  }, 30_000);

  afterAll(async () => {
    await renderer.closeBrowser();
  });

  test.each(KNOWN_INVALID.map((src, i) => [i, src]))(
    'flags known-invalid sample #%i as invalid',
    async (_, source) => {
      const result = await renderer.validateMermaid(source);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    },
    20_000,
  );

  test.each(KNOWN_VALID.map((src, i) => [i, src]))(
    'accepts known-valid sample #%i with no false positive',
    async (_, source) => {
      const result = await renderer.validateMermaid(source);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    },
    20_000,
  );
});
