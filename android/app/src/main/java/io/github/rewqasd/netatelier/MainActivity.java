package io.github.rewqasd.netatelier;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalDocumentsPlugin.class);
        registerPlugin(OcrPlugin.class);
        registerPlugin(ProjectStorePlugin.class);
        registerPlugin(MobileShellPlugin.class);
        registerPlugin(ExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
