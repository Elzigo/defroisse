.class public Lcom/visage/protocole/MainActivity;
.super Landroid/app/Activity;

.field private web:Landroid/webkit/WebView;
.field public pending:Landroid/webkit/PermissionRequest;
.field public fileCb:Landroid/webkit/ValueCallback;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 6
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # barre d'état claire, écran allumé pendant les routines
    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;
    move-result-object v1
    const/16 v2, 0x80
    invoke-virtual {v1, v2}, Landroid/view/Window;->addFlags(I)V
    const v2, -0xd0e12
    invoke-virtual {v1, v2}, Landroid/view/Window;->setStatusBarColor(I)V
    invoke-virtual {v1, v2}, Landroid/view/Window;->setNavigationBarColor(I)V
    invoke-virtual {v1}, Landroid/view/Window;->getDecorView()Landroid/view/View;
    move-result-object v1
    const/16 v2, 0x2010
    invoke-virtual {v1, v2}, Landroid/view/View;->setSystemUiVisibility(I)V

    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/visage/protocole/MainActivity;->web:Landroid/webkit/WebView;
    const v1, -0xd0e12
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    const/4 v3, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v1, v3}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V
    invoke-virtual {v1, v3}, Landroid/webkit/WebSettings;->setSupportMultipleWindows(Z)V

    # suit la taille de texte réglée sur le téléphone
    invoke-virtual {p0}, Landroid/app/Activity;->getResources()Landroid/content/res/Resources;
    move-result-object v2
    invoke-virtual {v2}, Landroid/content/res/Resources;->getConfiguration()Landroid/content/res/Configuration;
    move-result-object v2
    iget v2, v2, Landroid/content/res/Configuration;->fontScale:F
    const/high16 v3, 0x42c80000
    mul-float/2addr v2, v3
    float-to-int v2, v2
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setTextZoom(I)V

    new-instance v1, Lcom/visage/protocole/Client;
    invoke-direct {v1}, Lcom/visage/protocole/Client;-><init>()V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v1, Lcom/visage/protocole/Chrome;
    invoke-direct {v1, p0}, Lcom/visage/protocole/Chrome;-><init>(Lcom/visage/protocole/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    if-nez p1, :restore
    const-string v1, "file:///android_asset/www/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    goto :show
    :restore
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->restoreState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    move-result-object v1
    if-nez v1, :show
    const-string v1, "file:///android_asset/www/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    :show
    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V
    return-void
.end method

.method protected onSaveInstanceState(Landroid/os/Bundle;)V
    .registers 3
    invoke-super {p0, p1}, Landroid/app/Activity;->onSaveInstanceState(Landroid/os/Bundle;)V
    iget-object v0, p0, Lcom/visage/protocole/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :done
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->saveState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    :done
    return-void
.end method

.method public onBackPressed()V
    .registers 3
    iget-object v0, p0, Lcom/visage/protocole/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :exit
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1
    if-eqz v1, :exit
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :exit
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method

.method public onRequestPermissionsResult(I[Ljava/lang/String;[I)V
    .registers 7
    iget-object v0, p0, Lcom/visage/protocole/MainActivity;->pending:Landroid/webkit/PermissionRequest;
    if-eqz v0, :done
    const/4 v1, 0x0
    iput-object v1, p0, Lcom/visage/protocole/MainActivity;->pending:Landroid/webkit/PermissionRequest;
    array-length v1, p3
    if-eqz v1, :deny
    const/4 v1, 0x0
    aget v2, p3, v1
    if-nez v2, :deny
    invoke-virtual {v0}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V
    return-void
    :deny
    invoke-virtual {v0}, Landroid/webkit/PermissionRequest;->deny()V
    :done
    return-void
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 7
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    const/16 v0, 0x8
    if-ne p1, v0, :done
    iget-object v0, p0, Lcom/visage/protocole/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v0, :done
    const/4 v1, 0x0
    iput-object v1, p0, Lcom/visage/protocole/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;
    move-result-object v1
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :done
    return-void
.end method
