// Order matters: `./pdfjs` installs the global that pdf_viewer.mjs needs.
import './pdfjs';
import 'pdfjs-dist/web/pdf_viewer.css';

export {
  EventBus,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
  LinkTarget,
  ScrollMode,
  SimpleLinkService,
  SpreadMode,
} from 'pdfjs-dist/web/pdf_viewer.mjs';
